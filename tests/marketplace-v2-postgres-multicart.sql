\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA multicart;
CREATE TABLE multicart.wallet (id int PRIMARY KEY, opening bigint NOT NULL, balance bigint NOT NULL CHECK(balance>=0));
CREATE TABLE multicart.seller (id int PRIMARY KEY);
CREATE TABLE multicart.product (id int PRIMARY KEY, seller_id int NOT NULL REFERENCES multicart.seller, stock int NOT NULL CHECK(stock>=0), price bigint NOT NULL CHECK(price>0));
CREATE TABLE multicart.orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, request_key text NOT NULL UNIQUE, cart jsonb NOT NULL, total bigint NOT NULL, state text NOT NULL CHECK(state IN ('created','cancelled')));
CREATE TABLE multicart.line (order_id bigint REFERENCES multicart.orders, product_id int REFERENCES multicart.product, qty int NOT NULL CHECK(qty>0), price bigint NOT NULL, PRIMARY KEY(order_id,product_id));
CREATE TABLE multicart.journal (order_id bigint REFERENCES multicart.orders, op text NOT NULL CHECK(op IN ('debit','reversal')), delta bigint NOT NULL, PRIMARY KEY(order_id,op));
CREATE TABLE multicart.clearing (order_id bigint PRIMARY KEY REFERENCES multicart.orders, amount bigint NOT NULL, state text NOT NULL CHECK(state IN ('pending','voided')));
INSERT INTO multicart.wallet VALUES (1,2000,2000);
INSERT INTO multicart.seller VALUES (1),(2);
INSERT INTO multicart.product VALUES (10,1,5,100),(20,2,3,250);
CREATE FUNCTION multicart.checkout(k text, cart jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE oid bigint; old multicart.orders%ROWTYPE; e record; p multicart.product%ROWTYPE; total bigint:=0; n int:=0; normalized jsonb:='[]'::jsonb;
BEGIN
 IF k IS NULL OR jsonb_typeof(cart)<>'array' OR jsonb_array_length(cart)<1 OR jsonb_array_length(cart)>50 THEN RAISE EXCEPTION 'invalid cart'; END IF;
 FOR e IN SELECT (x->>'product_id')::int pid,(x->>'qty')::int qty,x FROM jsonb_array_elements(cart) x ORDER BY (x->>'product_id')::int LOOP
   IF jsonb_typeof(e.x)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(e.x))<>2 OR e.qty NOT BETWEEN 1 AND 99 OR EXISTS(SELECT 1 FROM jsonb_array_elements(normalized) v WHERE (v->>'product_id')::int=e.pid) THEN RAISE EXCEPTION 'invalid line'; END IF;
   normalized:=normalized||jsonb_build_array(jsonb_build_object('product_id',e.pid,'qty',e.qty)); n:=n+1;
 END LOOP;
 PERFORM 1 FROM multicart.wallet WHERE id=1 FOR UPDATE;
 SELECT * INTO old FROM multicart.orders WHERE request_key=k;
 IF FOUND THEN
   IF old.cart<>normalized THEN RAISE EXCEPTION 'conflicting replay'; END IF;
   RETURN old.id;
 END IF;
 FOR e IN SELECT (x->>'product_id')::int pid,(x->>'qty')::int qty FROM jsonb_array_elements(normalized) x ORDER BY (x->>'product_id')::int LOOP
   SELECT * INTO p FROM multicart.product WHERE id=e.pid FOR UPDATE;
   IF NOT FOUND OR p.stock<e.qty THEN RAISE EXCEPTION 'stock unavailable'; END IF;
   total:=total+p.price*e.qty;
 END LOOP;
 IF (SELECT balance FROM multicart.wallet WHERE id=1)<total THEN RAISE EXCEPTION 'insufficient balance'; END IF;
 INSERT INTO multicart.orders(request_key,cart,total,state) VALUES(k,normalized,total,'created') RETURNING id INTO oid;
 FOR e IN SELECT (x->>'product_id')::int pid,(x->>'qty')::int qty FROM jsonb_array_elements(normalized) x ORDER BY (x->>'product_id')::int LOOP
   SELECT * INTO p FROM multicart.product WHERE id=e.pid;
   UPDATE multicart.product SET stock=stock-e.qty WHERE id=e.pid;
   INSERT INTO multicart.line VALUES(oid,e.pid,e.qty,p.price);
 END LOOP;
 UPDATE multicart.wallet SET balance=balance-total WHERE id=1;
 INSERT INTO multicart.journal VALUES(oid,'debit',-total);
 INSERT INTO multicart.clearing VALUES(oid,total,'pending');
 RETURN oid;
END $$;
CREATE FUNCTION multicart.cancel(oid bigint) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o multicart.orders%ROWTYPE; e record;
BEGIN
 PERFORM 1 FROM multicart.wallet WHERE id=1 FOR UPDATE;
 SELECT * INTO o FROM multicart.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing order'; END IF;
 IF o.state='cancelled' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM multicart.journal WHERE order_id=oid AND op='debit' AND delta=-o.total) THEN RAISE EXCEPTION 'missing debit'; END IF;
 FOR e IN SELECT product_id,qty FROM multicart.line WHERE order_id=oid ORDER BY product_id LOOP
   UPDATE multicart.product SET stock=stock+e.qty WHERE id=e.product_id;
 END LOOP;
 UPDATE multicart.wallet SET balance=balance+o.total WHERE id=1;
 INSERT INTO multicart.journal VALUES(oid,'reversal',o.total);
 UPDATE multicart.clearing SET state='voided' WHERE order_id=oid AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'missing clearing'; END IF;
 UPDATE multicart.orders SET state='cancelled' WHERE id=oid;
END $$;
DO $$
DECLARE oid bigint; again bigint; cart jsonb:='[{"product_id":20,"qty":1},{"product_id":10,"qty":2}]';
BEGIN
 oid:=multicart.checkout('multi-1',cart);
 again:=multicart.checkout('multi-1','[{"product_id":10,"qty":2},{"product_id":20,"qty":1}]');
 IF oid<>again THEN RAISE EXCEPTION 'replay failed'; END IF;
 IF (SELECT total FROM multicart.orders WHERE id=oid)<>450 OR (SELECT balance FROM multicart.wallet WHERE id=1)<>1550 THEN RAISE EXCEPTION 'total/debit mismatch'; END IF;
 IF (SELECT count(*) FROM multicart.line WHERE order_id=oid)<>2 OR (SELECT stock FROM multicart.product WHERE id=10)<>3 OR (SELECT stock FROM multicart.product WHERE id=20)<>2 THEN RAISE EXCEPTION 'line/stock mismatch'; END IF;
 BEGIN PERFORM multicart.checkout('multi-2','[{"product_id":10,"qty":4},{"product_id":20,"qty":1}]'); RAISE EXCEPTION 'partial checkout accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='partial checkout accepted' THEN RAISE; END IF; END;
 IF (SELECT balance FROM multicart.wallet WHERE id=1)<>1550 OR (SELECT count(*) FROM multicart.orders)<>1 THEN RAISE EXCEPTION 'rollback failed'; END IF;
 BEGIN PERFORM multicart.checkout('multi-1','[{"product_id":10,"qty":1}]'); RAISE EXCEPTION 'conflicting replay accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='conflicting replay accepted' THEN RAISE; END IF; END;
 PERFORM multicart.cancel(oid); PERFORM multicart.cancel(oid);
 IF (SELECT balance FROM multicart.wallet WHERE id=1)<>2000 OR (SELECT stock FROM multicart.product WHERE id=10)<>5 OR (SELECT stock FROM multicart.product WHERE id=20)<>3 THEN RAISE EXCEPTION 'cancel mismatch'; END IF;
 IF (SELECT count(*) FROM multicart.journal WHERE order_id=oid)<>2 OR (SELECT state FROM multicart.clearing WHERE order_id=oid)<>'voided' THEN RAISE EXCEPTION 'journal/clearing mismatch'; END IF;
 IF (SELECT opening+COALESCE((SELECT SUM(delta) FROM multicart.journal),0) FROM multicart.wallet WHERE id=1)<>(SELECT balance FROM multicart.wallet WHERE id=1) THEN RAISE EXCEPTION 'reconciliation mismatch'; END IF;
 RAISE NOTICE 'Multicart PostgreSQL fixture passed: 2 sellers, 2 products, canonical replay, atomic rollback, cancellation and reconciliation';
END $$;
ROLLBACK;
