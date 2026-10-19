\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA v2_fixture;
CREATE TABLE v2_fixture.wallet (id integer PRIMARY KEY, opening bigint NOT NULL, balance bigint NOT NULL CHECK(balance>=0));
CREATE TABLE v2_fixture.product (id integer PRIMARY KEY, stock integer NOT NULL CHECK(stock>=0), price bigint NOT NULL CHECK(price>0));
CREATE TABLE v2_fixture.orders (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, request_key text NOT NULL UNIQUE, wallet_id integer NOT NULL REFERENCES v2_fixture.wallet, product_id integer NOT NULL REFERENCES v2_fixture.product, qty integer NOT NULL CHECK(qty>0), total bigint NOT NULL CHECK(total>0), status text NOT NULL CHECK(status IN ('created','cancelled')));
CREATE TABLE v2_fixture.journal (order_id integer NOT NULL REFERENCES v2_fixture.orders, operation text NOT NULL CHECK(operation IN ('debit','reversal')), delta bigint NOT NULL, PRIMARY KEY(order_id,operation));
CREATE TABLE v2_fixture.clearing (order_id integer PRIMARY KEY REFERENCES v2_fixture.orders, amount bigint NOT NULL CHECK(amount>0), state text NOT NULL CHECK(state IN ('pending','voided')));
INSERT INTO v2_fixture.wallet VALUES (1,1000,1000);
INSERT INTO v2_fixture.product VALUES (1,5,100);
CREATE FUNCTION v2_fixture.checkout(k text, q integer) RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE w bigint; p record; existing record; oid integer; total bigint;
BEGIN
 IF k IS NULL OR q<1 OR q>99 THEN RAISE EXCEPTION 'invalid request'; END IF;
 SELECT * INTO existing FROM v2_fixture.orders WHERE request_key=k;
 IF FOUND THEN
   IF existing.qty<>q OR existing.product_id<>1 THEN RAISE EXCEPTION 'conflicting replay'; END IF;
   RETURN existing.id;
 END IF;
 SELECT balance INTO w FROM v2_fixture.wallet WHERE id=1 FOR UPDATE;
 SELECT * INTO p FROM v2_fixture.product WHERE id=1 FOR UPDATE;
 SELECT * INTO existing FROM v2_fixture.orders WHERE request_key=k;
 IF FOUND THEN
   IF existing.qty<>q OR existing.product_id<>1 THEN RAISE EXCEPTION 'conflicting replay'; END IF;
   RETURN existing.id;
 END IF;
 total:=p.price*q;
 IF p.stock<q OR w<total THEN RAISE EXCEPTION 'insufficient stock or balance'; END IF;
 INSERT INTO v2_fixture.orders(request_key,wallet_id,product_id,qty,total,status) VALUES(k,1,1,q,total,'created') RETURNING id INTO oid;
 UPDATE v2_fixture.wallet SET balance=balance-total WHERE id=1;
 UPDATE v2_fixture.product SET stock=stock-q WHERE id=1;
 INSERT INTO v2_fixture.journal VALUES(oid,'debit',-total);
 INSERT INTO v2_fixture.clearing VALUES(oid,total,'pending');
 RETURN oid;
END $$;
CREATE FUNCTION v2_fixture.cancel_order(oid integer) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE o record;
BEGIN
 PERFORM 1 FROM v2_fixture.wallet WHERE id=1 FOR UPDATE;
 SELECT * INTO o FROM v2_fixture.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown order'; END IF;
 IF o.status='cancelled' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM v2_fixture.journal WHERE order_id=oid AND operation='debit' AND delta=-o.total) THEN RAISE EXCEPTION 'missing debit'; END IF;
 UPDATE v2_fixture.wallet SET balance=balance+o.total WHERE id=o.wallet_id;
 UPDATE v2_fixture.product SET stock=stock+o.qty WHERE id=o.product_id;
 INSERT INTO v2_fixture.journal VALUES(oid,'reversal',o.total);
 UPDATE v2_fixture.clearing SET state='voided' WHERE order_id=oid AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'missing clearing'; END IF;
 UPDATE v2_fixture.orders SET status='cancelled' WHERE id=oid;
END $$;
DO $$
DECLARE a integer; b integer;
BEGIN
 a:=v2_fixture.checkout('test-1',2);
 b:=v2_fixture.checkout('test-1',2);
 IF a<>b THEN RAISE EXCEPTION 'replay failed'; END IF;
 IF (SELECT balance FROM v2_fixture.wallet WHERE id=1)<>800 THEN RAISE EXCEPTION 'debit failed'; END IF;
 IF (SELECT stock FROM v2_fixture.product WHERE id=1)<>3 THEN RAISE EXCEPTION 'stock failed'; END IF;
 BEGIN PERFORM v2_fixture.checkout('test-1',3); RAISE EXCEPTION 'conflicting replay accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='conflicting replay accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM v2_fixture.checkout('test-2',99); RAISE EXCEPTION 'oversell accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='oversell accepted' THEN RAISE; END IF; END;
 PERFORM v2_fixture.cancel_order(a);
 PERFORM v2_fixture.cancel_order(a);
 IF (SELECT balance FROM v2_fixture.wallet WHERE id=1)<>1000 OR (SELECT stock FROM v2_fixture.product WHERE id=1)<>5 THEN RAISE EXCEPTION 'cancel failed'; END IF;
 IF (SELECT count(*) FROM v2_fixture.journal WHERE order_id=a)<>2 THEN RAISE EXCEPTION 'duplicate journal'; END IF;
 IF (SELECT state FROM v2_fixture.clearing WHERE order_id=a)<>'voided' THEN RAISE EXCEPTION 'clearing not voided'; END IF;
 IF (SELECT opening+COALESCE((SELECT SUM(delta) FROM v2_fixture.journal),0) FROM v2_fixture.wallet WHERE id=1)<>(SELECT balance FROM v2_fixture.wallet WHERE id=1) THEN RAISE EXCEPTION 'reconciliation failed'; END IF;
 RAISE NOTICE 'PostgreSQL smoke tests passed: checkout, replay, oversell rollback, cancel replay, journal and reconciliation';
END $$;
ROLLBACK;
