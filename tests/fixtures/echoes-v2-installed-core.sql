-- Isolated reproduction of the inspected staging V2 checkout/cancel core.
-- This file is for ephemeral GitHub Actions PostgreSQL only, not a migration.
CREATE SCHEMA echoes_v2_synthetic;
CREATE TABLE echoes_v2_synthetic.sellers (
 seller_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL,
 active boolean NOT NULL DEFAULT true, test_only boolean NOT NULL DEFAULT true CHECK(test_only)
);
CREATE TABLE echoes_v2_synthetic.products (
 product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id uuid NOT NULL REFERENCES echoes_v2_synthetic.sellers(seller_id) ON DELETE RESTRICT,
 unit_price_ec bigint NOT NULL CHECK(unit_price_ec BETWEEN 1 AND 9007199254740991),
 available_qty integer NOT NULL CHECK(available_qty>=0),
 active boolean NOT NULL DEFAULT true, test_only boolean NOT NULL DEFAULT true CHECK(test_only)
);
CREATE TABLE echoes_v2_synthetic.wallets (
 wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), fixture_buyer_id uuid NOT NULL UNIQUE,
 opening_ec bigint NOT NULL CHECK(opening_ec BETWEEN 0 AND 9007199254740991),
 balance_ec bigint NOT NULL CHECK(balance_ec BETWEEN 0 AND 9007199254740991),
 test_only boolean NOT NULL DEFAULT true CHECK(test_only)
);
CREATE TABLE echoes_v2_synthetic.orders (
 order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wallet_id uuid NOT NULL REFERENCES echoes_v2_synthetic.wallets(wallet_id) ON DELETE RESTRICT,
 request_key uuid NOT NULL, cart jsonb NOT NULL CHECK(jsonb_typeof(cart)='array'),
 total_ec bigint NOT NULL CHECK(total_ec BETWEEN 1 AND 9007199254740991),
 status text NOT NULL DEFAULT 'created' CHECK(status IN ('created','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wallet_id,request_key)
);
CREATE TABLE echoes_v2_synthetic.order_lines (
 order_id uuid NOT NULL REFERENCES echoes_v2_synthetic.orders(order_id) ON DELETE RESTRICT,
 product_id uuid NOT NULL REFERENCES echoes_v2_synthetic.products(product_id) ON DELETE RESTRICT,
 seller_id uuid NOT NULL REFERENCES echoes_v2_synthetic.sellers(seller_id) ON DELETE RESTRICT,
 qty integer NOT NULL CHECK(qty BETWEEN 1 AND 99),
 unit_price_ec bigint NOT NULL CHECK(unit_price_ec>0),
 line_total_ec bigint NOT NULL CHECK(line_total_ec>0),
 PRIMARY KEY(order_id,product_id)
);
CREATE TABLE echoes_v2_synthetic.reservations (
 order_id uuid NOT NULL REFERENCES echoes_v2_synthetic.orders(order_id) ON DELETE RESTRICT,
 product_id uuid NOT NULL REFERENCES echoes_v2_synthetic.products(product_id) ON DELETE RESTRICT,
 qty integer NOT NULL CHECK(qty BETWEEN 1 AND 99),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','released')),
 PRIMARY KEY(order_id,product_id)
);
CREATE TABLE echoes_v2_synthetic.journal (
 entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES echoes_v2_synthetic.orders(order_id) ON DELETE RESTRICT,
 wallet_id uuid NOT NULL REFERENCES echoes_v2_synthetic.wallets(wallet_id) ON DELETE RESTRICT,
 operation text NOT NULL CHECK(operation IN ('debit','reversal')),
 delta_ec bigint NOT NULL CHECK((operation='debit' AND delta_ec<0) OR (operation='reversal' AND delta_ec>0)),
 request_key uuid NOT NULL,
 UNIQUE(order_id,operation), UNIQUE(wallet_id,request_key)
);
CREATE TABLE echoes_v2_synthetic.clearing (
 order_id uuid PRIMARY KEY REFERENCES echoes_v2_synthetic.orders(order_id) ON DELETE RESTRICT,
 amount_ec bigint NOT NULL CHECK(amount_ec>0),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','voided'))
);
CREATE OR REPLACE FUNCTION echoes_v2_synthetic.guard_wallet_open() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN
 IF NEW.opening_ec<>NEW.balance_ec THEN RAISE EXCEPTION 'invalid opening balance'; END IF;
 RETURN NEW;
END $function$;
CREATE TRIGGER wallet_open BEFORE INSERT ON echoes_v2_synthetic.wallets FOR EACH ROW EXECUTE FUNCTION echoes_v2_synthetic.guard_wallet_open();
CREATE OR REPLACE FUNCTION echoes_v2_synthetic.reject_journal_change() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN RAISE EXCEPTION 'immutable journal'; END $function$;
CREATE TRIGGER journal_immutable BEFORE UPDATE OR DELETE ON echoes_v2_synthetic.journal FOR EACH ROW EXECUTE FUNCTION echoes_v2_synthetic.reject_journal_change();
CREATE OR REPLACE FUNCTION echoes_v2_synthetic.checkout(buyer uuid, request uuid, cart jsonb)
 RETURNS uuid LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE w echoes_v2_synthetic.wallets%ROWTYPE; existing echoes_v2_synthetic.orders%ROWTYPE; item record; prod echoes_v2_synthetic.products%ROWTYPE; canonical jsonb:='[]'::jsonb; total bigint:=0; oid uuid; count_items int:=0;
BEGIN
 IF buyer IS NULL OR request IS NULL OR jsonb_typeof(cart)<>'array' OR jsonb_array_length(cart) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid request'; END IF;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty,x FROM jsonb_array_elements(cart) x ORDER BY (x->>'product_id')::uuid LOOP
   IF jsonb_typeof(item.x)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item.x))<>2 OR item.qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'invalid line'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(canonical) c WHERE (c->>'product_id')::uuid=item.pid) THEN RAISE EXCEPTION 'duplicate product'; END IF;
   canonical:=canonical||jsonb_build_array(jsonb_build_object('product_id',item.pid,'qty',item.qty));
   count_items:=count_items+1;
 END LOOP;
 SELECT * INTO w FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=buyer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'test wallet missing'; END IF;
 SELECT * INTO existing FROM echoes_v2_synthetic.orders WHERE wallet_id=w.wallet_id AND request_key=request;
 IF FOUND THEN
   IF existing.cart<>canonical THEN RAISE EXCEPTION 'conflicting replay'; END IF;
   RETURN existing.order_id;
 END IF;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty FROM jsonb_array_elements(canonical) x ORDER BY (x->>'product_id')::uuid LOOP
   SELECT * INTO prod FROM echoes_v2_synthetic.products WHERE product_id=item.pid AND active AND test_only FOR UPDATE;
   IF NOT FOUND OR prod.available_qty<item.qty THEN RAISE EXCEPTION 'insufficient stock'; END IF;
   total:=total+prod.unit_price_ec*item.qty;
   IF total>9007199254740991 THEN RAISE EXCEPTION 'total overflow'; END IF;
 END LOOP;
 IF w.balance_ec<total THEN RAISE EXCEPTION 'insufficient balance'; END IF;
 INSERT INTO echoes_v2_synthetic.orders(wallet_id,request_key,cart,total_ec) VALUES(w.wallet_id,request,canonical,total) RETURNING order_id INTO oid;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty FROM jsonb_array_elements(canonical) x ORDER BY (x->>'product_id')::uuid LOOP
   SELECT * INTO prod FROM echoes_v2_synthetic.products WHERE product_id=item.pid;
   UPDATE echoes_v2_synthetic.products SET available_qty=available_qty-item.qty WHERE product_id=item.pid;
   INSERT INTO echoes_v2_synthetic.order_lines VALUES(oid,item.pid,prod.seller_id,item.qty,prod.unit_price_ec,prod.unit_price_ec*item.qty);
   INSERT INTO echoes_v2_synthetic.reservations VALUES(oid,item.pid,item.qty,'reserved');
 END LOOP;
 UPDATE echoes_v2_synthetic.wallets SET balance_ec=balance_ec-total WHERE wallet_id=w.wallet_id;
 INSERT INTO echoes_v2_synthetic.journal(order_id,wallet_id,operation,delta_ec,request_key) VALUES(oid,w.wallet_id,'debit',-total,request);
 INSERT INTO echoes_v2_synthetic.clearing VALUES(oid,total,'pending');
 RETURN oid;
END $function$;
CREATE OR REPLACE FUNCTION echoes_v2_synthetic.cancel(buyer uuid, oid uuid, request uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE w echoes_v2_synthetic.wallets%ROWTYPE; o echoes_v2_synthetic.orders%ROWTYPE; line record;
BEGIN
 IF buyer IS NULL OR oid IS NULL OR request IS NULL THEN RAISE EXCEPTION 'invalid cancellation'; END IF;
 SELECT * INTO w FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=buyer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'test wallet missing'; END IF;
 SELECT * INTO o FROM echoes_v2_synthetic.orders WHERE order_id=oid AND wallet_id=w.wallet_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
 IF o.status='cancelled' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM echoes_v2_synthetic.journal WHERE order_id=oid AND operation='debit' AND delta_ec=-o.total_ec) THEN RAISE EXCEPTION 'debit missing'; END IF;
 IF w.balance_ec>9007199254740991-o.total_ec THEN RAISE EXCEPTION 'refund overflow'; END IF;
 FOR line IN SELECT product_id,qty FROM echoes_v2_synthetic.order_lines WHERE order_id=oid ORDER BY product_id LOOP
   UPDATE echoes_v2_synthetic.products SET available_qty=available_qty+line.qty WHERE product_id=line.product_id;
   UPDATE echoes_v2_synthetic.reservations SET state='released' WHERE order_id=oid AND product_id=line.product_id AND state='reserved';
   IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing'; END IF;
 END LOOP;
 UPDATE echoes_v2_synthetic.wallets SET balance_ec=balance_ec+o.total_ec WHERE wallet_id=w.wallet_id;
 INSERT INTO echoes_v2_synthetic.journal(order_id,wallet_id,operation,delta_ec,request_key) VALUES(oid,w.wallet_id,'reversal',o.total_ec,request);
 UPDATE echoes_v2_synthetic.clearing SET state='voided' WHERE order_id=oid AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'clearing missing'; END IF;
 UPDATE echoes_v2_synthetic.orders SET status='cancelled' WHERE order_id=oid;
END $function$;
