\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Verifies an isolated least-privilege role cannot bypass FORCE RLS.
BEGIN;
CREATE ROLE v2_limited_executor NOLOGIN NOBYPASSRLS;
GRANT USAGE ON SCHEMA v2_real TO v2_limited_executor;
GRANT SELECT ON v2_real.wallets TO v2_limited_executor;
-- Explicit deny by default: no RLS policies exist on this synthetic fixture.
DO $$
BEGIN
 IF (SELECT rolcanlogin OR rolbypassrls FROM pg_roles WHERE rolname='v2_limited_executor') THEN
  RAISE EXCEPTION 'executor must be NOLOGIN NOBYPASSRLS';
 END IF;
 IF has_table_privilege('v2_limited_executor','v2_real.wallets','INSERT') THEN
  RAISE EXCEPTION 'executor must not insert wallets';
 END IF;
END $$;
SET LOCAL ROLE v2_limited_executor;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM v2_real.wallets;
 IF n<>0 THEN RAISE EXCEPTION 'FORCE RLS failed: private wallets visible'; END IF;
 BEGIN
  INSERT INTO v2_real.wallets(fixture_buyer_id,opening_ec,balance_ec)
  VALUES('00000000-0000-0000-0000-000000000091',100,100);
  RAISE EXCEPTION 'SECURITY FAILURE: wallet INSERT allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;
