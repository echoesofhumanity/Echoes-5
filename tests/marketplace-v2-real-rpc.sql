\set ON_ERROR_STOP on
-- Disposable test database only. No Supabase connection or credentials.
CREATE FUNCTION v2_real.checkout(buyer uuid, request uuid, cart jsonb) RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE w v2_real.wallets%ROWTYPE; existing v2_real.orders%ROWTYPE; item record; prod v2_real.products%ROWTYPE; canonical jsonb:='[]'::jsonb; total bigint:=0; oid uuid; count_items int:=0;
BEGIN
 IF buyer IS NULL OR request IS NULL OR jsonb_typeof(cart)<>'array' OR jsonb_array_length(cart) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid request'; END IF;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty,x FROM jsonb_array_elements(cart) x ORDER BY (x->>'product_id')::uuid LOOP
   IF jsonb_typeof(item.x)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item.x))<>2 OR item.qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'invalid line'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(canonical) c WHERE (c->>'product_id')::uuid=item.pid) THEN RAISE EXCEPTION 'duplicate product'; END IF;
   canonical:=canonical||jsonb_build_array(jsonb_build_object('product_id',item.pid,'qty',item.qty));
   count_items:=count_items+1;
 END LOOP;
 SELECT * INTO w FROM v2_real.wallets WHERE fixture_buyer_id=buyer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'test wallet missing'; END IF;
 SELECT * INTO existing FROM v2_real.orders WHERE wallet_id=w.wallet_id AND request_key=request;
 IF FOUND THEN
   IF existing.cart<>canonical THEN RAISE EXCEPTION 'conflicting replay'; END IF;
   RETURN existing.order_id;
 END IF;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty FROM jsonb_array_elements(canonical) x ORDER BY (x->>'product_id')::uuid LOOP
   SELECT * INTO prod FROM v2_real.products WHERE product_id=item.pid AND active AND test_only FOR UPDATE;
   IF NOT FOUND OR prod.available_qty<item.qty THEN RAISE EXCEPTION 'insufficient stock'; END IF;
   total:=total+prod.unit_price_ec*item.qty;
   IF total>9007199254740991 THEN RAISE EXCEPTION 'total overflow'; END IF;
 END LOOP;
 IF w.balance_ec<total THEN RAISE EXCEPTION 'insufficient balance'; END IF;
 INSERT INTO v2_real.orders(wallet_id,request_key,cart,total_ec) VALUES(w.wallet_id,request,canonical,total) RETURNING order_id INTO oid;
 FOR item IN SELECT (x->>'product_id')::uuid pid,(x->>'qty')::int qty FROM jsonb_array_elements(canonical) x ORDER BY (x->>'product_id')::uuid LOOP
   SELECT * INTO prod FROM v2_real.products WHERE product_id=item.pid;
   UPDATE v2_real.products SET available_qty=available_qty-item.qty WHERE product_id=item.pid;
   INSERT INTO v2_real.order_lines VALUES(oid,item.pid,prod.seller_id,item.qty,prod.unit_price_ec,prod.unit_price_ec*item.qty);
   INSERT INTO v2_real.reservations VALUES(oid,item.pid,item.qty,'reserved');
 END LOOP;
 UPDATE v2_real.wallets SET balance_ec=balance_ec-total WHERE wallet_id=w.wallet_id;
 INSERT INTO v2_real.journal(order_id,wallet_id,operation,delta_ec,request_key) VALUES(oid,w.wallet_id,'debit',-total,request);
 INSERT INTO v2_real.clearing VALUES(oid,total,'pending');
 RETURN oid;
END $$;
CREATE FUNCTION v2_real.cancel(buyer uuid, oid uuid, request uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE w v2_real.wallets%ROWTYPE; o v2_real.orders%ROWTYPE; line record;
BEGIN
 IF buyer IS NULL OR oid IS NULL OR request IS NULL THEN RAISE EXCEPTION 'invalid cancellation'; END IF;
 SELECT * INTO w FROM v2_real.wallets WHERE fixture_buyer_id=buyer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'test wallet missing'; END IF;
 SELECT * INTO o FROM v2_real.orders WHERE order_id=oid AND wallet_id=w.wallet_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
 IF o.status='cancelled' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM v2_real.journal WHERE order_id=oid AND operation='debit' AND delta_ec=-o.total_ec) THEN RAISE EXCEPTION 'debit missing'; END IF;
 IF w.balance_ec>9007199254740991-o.total_ec THEN RAISE EXCEPTION 'refund overflow'; END IF;
 FOR line IN SELECT product_id,qty FROM v2_real.order_lines WHERE order_id=oid ORDER BY product_id LOOP
   UPDATE v2_real.products SET available_qty=available_qty+line.qty WHERE product_id=line.product_id;
   UPDATE v2_real.reservations SET state='released' WHERE order_id=oid AND product_id=line.product_id AND state='reserved';
   IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing'; END IF;
 END LOOP;
 UPDATE v2_real.wallets SET balance_ec=balance_ec+o.total_ec WHERE wallet_id=w.wallet_id;
 INSERT INTO v2_real.journal(order_id,wallet_id,operation,delta_ec,request_key) VALUES(oid,w.wallet_id,'reversal',o.total_ec,request);
 UPDATE v2_real.clearing SET state='voided' WHERE order_id=oid AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'clearing missing'; END IF;
 UPDATE v2_real.orders SET status='cancelled' WHERE order_id=oid;
END $$;
DO $$
DECLARE buyer uuid:='00000000-0000-0000-0000-000000000001'; seller1 uuid:='00000000-0000-0000-0000-000000000011'; seller2 uuid:='00000000-0000-0000-0000-000000000012'; p1 uuid:='00000000-0000-0000-0000-000000000021'; p2 uuid:='00000000-0000-0000-0000-000000000022'; req uuid:='00000000-0000-0000-0000-000000000031'; cancel_req uuid:='00000000-0000-0000-0000-000000000032'; oid uuid; again uuid;
BEGIN
 INSERT INTO v2_real.wallets(fixture_buyer_id,opening_ec,balance_ec) VALUES(buyer,2000,2000);
 INSERT INTO v2_real.sellers(seller_id,label) VALUES(seller1,'synthetic-a'),(seller2,'synthetic-b');
 INSERT INTO v2_real.products(product_id,seller_id,unit_price_ec,available_qty) VALUES(p1,seller1,100,5),(p2,seller2,250,3);
 oid:=v2_real.checkout(buyer,req,jsonb_build_array(jsonb_build_object('product_id',p2,'qty',1),jsonb_build_object('product_id',p1,'qty',2)));
 again:=v2_real.checkout(buyer,req,jsonb_build_array(jsonb_build_object('product_id',p1,'qty',2),jsonb_build_object('product_id',p2,'qty',1)));
 IF oid<>again OR (SELECT total_ec FROM v2_real.orders WHERE order_id=oid)<>450 OR (SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id=buyer)<>1550 THEN RAISE EXCEPTION 'checkout/replay mismatch'; END IF;
 IF (SELECT count(*) FROM v2_real.order_lines WHERE order_id=oid)<>2 OR (SELECT count(*) FROM v2_real.reservations WHERE order_id=oid AND state='reserved')<>2 THEN RAISE EXCEPTION 'lines/reservations mismatch'; END IF;
 PERFORM v2_real.cancel(buyer,oid,cancel_req);
 PERFORM v2_real.cancel(buyer,oid,cancel_req);
 IF (SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id=buyer)<>2000 OR (SELECT count(*) FROM v2_real.journal WHERE order_id=oid)<>2 OR (SELECT state FROM v2_real.clearing WHERE order_id=oid)<>'voided' THEN RAISE EXCEPTION 'cancel mismatch'; END IF;
 IF (SELECT count(*) FROM v2_real.reservations WHERE order_id=oid AND state='released')<>2 THEN RAISE EXCEPTION 'reservation release mismatch'; END IF;
 IF (SELECT opening_ec+(SELECT COALESCE(SUM(delta_ec),0) FROM v2_real.journal) FROM v2_real.wallets WHERE fixture_buyer_id=buyer)<>(SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id=buyer) THEN RAISE EXCEPTION 'reconciliation mismatch'; END IF;
 RAISE NOTICE 'Real V2 schema integration fixture PASS: multicart, replay, reservations, clearing, journal and cancellation';
END $$;
