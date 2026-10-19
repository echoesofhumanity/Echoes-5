\set ON_ERROR_STOP on
-- Disposable PostgreSQL auth-boundary fixture only. NOT a Supabase auth implementation.
-- Existing v2_real.checkout/cancel take caller-supplied buyer UUIDs and remain
-- forbidden to untrusted roles. This wrapper derives a fixture identity from
-- PostgreSQL session_user (not from caller JSON or a custom GUC).
CREATE ROLE v2_fixture_buyer NOLOGIN;
CREATE ROLE v2_fixture_stranger NOLOGIN;
CREATE TABLE v2_real.fixture_principals (
  db_principal name PRIMARY KEY,
  fixture_buyer_id uuid NOT NULL UNIQUE
);
REVOKE ALL ON v2_real.fixture_principals FROM PUBLIC;
INSERT INTO v2_real.fixture_principals(db_principal,fixture_buyer_id)
VALUES('v2_fixture_buyer','00000000-0000-0000-0000-000000000001');
CREATE FUNCTION v2_real.checkout_as_session(request uuid, cart jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE buyer uuid;
BEGIN
  SELECT fixture_buyer_id INTO buyer FROM v2_real.fixture_principals
    WHERE db_principal=session_user;
  IF buyer IS NULL THEN RAISE EXCEPTION 'unauthorized fixture principal' USING ERRCODE='28000'; END IF;
  RETURN v2_real.checkout(buyer,request,cart);
END $$;
CREATE FUNCTION v2_real.cancel_as_session(oid uuid, request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE buyer uuid;
BEGIN
  SELECT fixture_buyer_id INTO buyer FROM v2_real.fixture_principals
    WHERE db_principal=session_user;
  IF buyer IS NULL THEN RAISE EXCEPTION 'unauthorized fixture principal' USING ERRCODE='28000'; END IF;
  PERFORM v2_real.cancel(buyer,oid,request);
END $$;
REVOKE ALL ON FUNCTION v2_real.checkout_as_session(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION v2_real.cancel_as_session(uuid,uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA v2_real TO v2_fixture_buyer,v2_fixture_stranger;
GRANT EXECUTE ON FUNCTION v2_real.checkout_as_session(uuid,jsonb) TO v2_fixture_buyer,v2_fixture_stranger;
GRANT EXECUTE ON FUNCTION v2_real.cancel_as_session(uuid,uuid) TO v2_fixture_buyer,v2_fixture_stranger;

-- The fixture buyer can access the wrapper but not the legacy test-only core
-- functions or any wallet/journal table.
DO $$
BEGIN
  IF has_function_privilege('v2_fixture_buyer','v2_real.checkout(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'buyer can call raw checkout';
  END IF;
  IF has_table_privilege('v2_fixture_buyer','v2_real.wallets','UPDATE') THEN
    RAISE EXCEPTION 'buyer can mutate wallet';
  END IF;
END $$;
SET SESSION AUTHORIZATION v2_fixture_buyer;
DO $$
DECLARE oid uuid;
BEGIN
  oid:=v2_real.checkout_as_session(
    '00000000-0000-0000-0000-000000000041',
    '[{"product_id":"00000000-0000-0000-0000-000000000021","qty":1}]'::jsonb);
  PERFORM v2_real.cancel_as_session(oid,'00000000-0000-0000-0000-000000000042');
END $$;
RESET SESSION AUTHORIZATION;

SET SESSION AUTHORIZATION v2_fixture_stranger;
DO $$
BEGIN
  BEGIN
    PERFORM v2_real.checkout_as_session(
      '00000000-0000-0000-0000-000000000043','[]'::jsonb);
    RAISE EXCEPTION 'stranger unexpectedly authorized';
  EXCEPTION WHEN invalid_authorization_specification THEN NULL;
  END;
END $$;
RESET SESSION AUTHORIZATION;

DO $$
BEGIN
 IF (SELECT balance_ec FROM v2_real.wallets
     WHERE fixture_buyer_id='00000000-0000-0000-0000-000000000001')<>2000 THEN
   RAISE EXCEPTION 'authenticated checkout/cancel reconciliation failed';
 END IF;
 RAISE NOTICE 'Fixture session principal boundary passed';
END $$;

-- This test does NOT model Supabase JWT claims, PostgREST role switching,
-- auth.uid(), RLS under a privileged function owner, or production grants.
-- No public RPC may be deployed based on this fixture alone.
