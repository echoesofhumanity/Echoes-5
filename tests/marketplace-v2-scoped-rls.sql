\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Prove owner-scoped RLS and deny cross-buyer access.
BEGIN;
CREATE ROLE v2_scoped_executor NOLOGIN NOBYPASSRLS;
GRANT USAGE ON SCHEMA v2_real TO v2_scoped_executor;
GRANT SELECT ON v2_real.wallets TO v2_scoped_executor;
CREATE POLICY v2_scoped_wallet_read ON v2_real.wallets FOR SELECT TO v2_scoped_executor
USING (fixture_buyer_id = nullif(current_setting('v2_test.buyer',true),'')::uuid);
INSERT INTO v2_real.wallets(fixture_buyer_id,opening_ec,balance_ec)
VALUES ('00000000-0000-0000-0000-000000000081',100,100),
       ('00000000-0000-0000-0000-000000000082',200,200);
SET LOCAL ROLE v2_scoped_executor;
SELECT set_config('v2_test.buyer','00000000-0000-0000-0000-000000000081',true);
DO $$
DECLARE visible_count integer; own_balance bigint;
BEGIN
 SELECT count(*),max(balance_ec) INTO visible_count,own_balance FROM v2_real.wallets;
 IF visible_count<>1 OR own_balance<>100 THEN RAISE EXCEPTION 'buyer A isolation failed'; END IF;
END $$;
SELECT set_config('v2_test.buyer','00000000-0000-0000-0000-000000000082',true);
DO $$
DECLARE visible_count integer; own_balance bigint;
BEGIN
 SELECT count(*),max(balance_ec) INTO visible_count,own_balance FROM v2_real.wallets;
 IF visible_count<>1 OR own_balance<>200 THEN RAISE EXCEPTION 'buyer B isolation failed'; END IF;
END $$;
SELECT set_config('v2_test.buyer','',true);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM v2_real.wallets) THEN RAISE EXCEPTION 'null buyer must see no wallets'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
