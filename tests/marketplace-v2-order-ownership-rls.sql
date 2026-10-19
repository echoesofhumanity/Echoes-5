\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Test ownership guard independent of browser JWT.
BEGIN;
CREATE ROLE v2_owner_api NOLOGIN NOBYPASSRLS;
GRANT USAGE ON SCHEMA v2_real TO v2_owner_api;
GRANT SELECT ON v2_real.orders,v2_real.wallets TO v2_owner_api;
CREATE POLICY v2_owner_wallet_read ON v2_real.wallets FOR SELECT TO v2_owner_api USING (fixture_buyer_id=nullif(current_setting('v2_test.buyer',true),'')::uuid);
CREATE POLICY v2_owner_order_read ON v2_real.orders FOR SELECT TO v2_owner_api USING (wallet_id IN (SELECT wallet_id FROM v2_real.wallets WHERE fixture_buyer_id=nullif(current_setting('v2_test.buyer',true),'')::uuid));
INSERT INTO v2_real.wallets(fixture_buyer_id,opening_ec,balance_ec) VALUES ('00000000-0000-0000-0000-000000000091',100,100),('00000000-0000-0000-0000-000000000092',100,100);
INSERT INTO v2_real.orders(wallet_id,request_key,cart,total_ec) SELECT wallet_id,gen_random_uuid(),'[]'::jsonb,1 FROM v2_real.wallets WHERE fixture_buyer_id IN ('00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000092');
SET LOCAL ROLE v2_owner_api;
SELECT set_config('v2_test.buyer','00000000-0000-0000-0000-000000000091',true);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM v2_real.orders;
 IF n<>1 THEN RAISE EXCEPTION 'cross-buyer order isolation failed'; END IF;
END $$;
SELECT set_config('v2_test.buyer','',true);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM v2_real.orders) THEN RAISE EXCEPTION 'anonymous order visibility'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
