\set ON_ERROR_STOP on
-- Disposable PostgreSQL only: a foreign buyer cannot cancel another buyer's order.
BEGIN;
INSERT INTO v2_real.wallets(fixture_buyer_id,opening_ec,balance_ec)
VALUES ('00000000-0000-0000-0000-0000000000a1',1000,1000),
       ('00000000-0000-0000-0000-0000000000b1',1000,1000);
INSERT INTO v2_real.sellers(seller_id,label) VALUES('00000000-0000-0000-0000-0000000000c1','cancel-owner-fixture');
INSERT INTO v2_real.products(product_id,seller_id,unit_price_ec,available_qty)
VALUES('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c1',100,4);
DO $$
DECLARE oid uuid; before_journal int;
BEGIN
 oid:=v2_real.checkout('00000000-0000-0000-0000-0000000000a1',
 '00000000-0000-0000-0000-0000000000e1',
 '[{"product_id":"00000000-0000-0000-0000-0000000000d1","qty":1}]'::jsonb);
 SELECT count(*) INTO before_journal FROM v2_real.journal WHERE order_id=oid;
 BEGIN
  PERFORM v2_real.cancel('00000000-0000-0000-0000-0000000000b1',oid,
   '00000000-0000-0000-0000-0000000000e2');
  RAISE EXCEPTION 'SECURITY FAILURE: foreign buyer cancelled order';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'order not found' THEN RAISE; END IF;
 END;
 IF (SELECT status FROM v2_real.orders WHERE order_id=oid)<>'created'
 OR (SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id='00000000-0000-0000-0000-0000000000a1')<>900
 OR (SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id='00000000-0000-0000-0000-0000000000b1')<>1000
 OR (SELECT available_qty FROM v2_real.products WHERE product_id='00000000-0000-0000-0000-0000000000d1')<>3
 OR (SELECT count(*) FROM v2_real.journal WHERE order_id=oid)<>before_journal
 OR (SELECT state FROM v2_real.clearing WHERE order_id=oid)<>'pending'
 THEN RAISE EXCEPTION 'foreign cancellation mutated financial state'; END IF;
 PERFORM v2_real.cancel('00000000-0000-0000-0000-0000000000a1',oid,
 '00000000-0000-0000-0000-0000000000e3');
 IF (SELECT balance_ec FROM v2_real.wallets WHERE fixture_buyer_id='00000000-0000-0000-0000-0000000000a1')<>1000
 OR (SELECT state FROM v2_real.clearing WHERE order_id=oid)<>'voided'
 THEN RAISE EXCEPTION 'owner cancellation failed'; END IF;
END $$;
ROLLBACK;
