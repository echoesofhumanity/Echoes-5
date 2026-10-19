\set ON_ERROR_STOP on
-- Disposable PostgreSQL security regression only. No Supabase project access.
-- Test functions currently accept a caller-supplied buyer ID and are NOT approved public RPCs.
REVOKE ALL ON SCHEMA v2_real FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA v2_real FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA v2_real FROM PUBLIC;
CREATE ROLE v2_untrusted NOLOGIN;
GRANT USAGE ON SCHEMA v2_real TO v2_untrusted;
-- Granting schema usage alone must never permit reading/writing fixture data
-- or invoking the unauthenticated test-only checkout/cancel functions.
DO $$
DECLARE buyer uuid:='00000000-0000-0000-0000-000000000001';
BEGIN
 IF has_table_privilege('v2_untrusted','v2_real.wallets','SELECT') THEN RAISE EXCEPTION 'untrusted wallet SELECT allowed'; END IF;
 IF has_table_privilege('v2_untrusted','v2_real.journal','INSERT') THEN RAISE EXCEPTION 'untrusted journal INSERT allowed'; END IF;
 IF has_table_privilege('v2_untrusted','v2_real.products','UPDATE') THEN RAISE EXCEPTION 'untrusted stock UPDATE allowed'; END IF;
 IF has_function_privilege('v2_untrusted','v2_real.checkout(uuid,uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'untrusted checkout EXECUTE allowed'; END IF;
 IF has_function_privilege('v2_untrusted','v2_real.cancel(uuid,uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'untrusted cancel EXECUTE allowed'; END IF;
 RAISE NOTICE 'V2 untrusted-role grant checks passed';
END $$;
SET ROLE v2_untrusted;
DO $$
BEGIN
 BEGIN
  PERFORM count(*) FROM v2_real.wallets;
  RAISE EXCEPTION 'unauthorized wallet read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM v2_real.checkout('00000000-0000-0000-0000-000000000001'::uuid,'00000000-0000-0000-0000-000000000099'::uuid,'[]'::jsonb);
  RAISE EXCEPTION 'unauthorized RPC call succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
REVOKE USAGE ON SCHEMA v2_real FROM v2_untrusted;
DROP ROLE v2_untrusted;
