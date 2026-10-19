\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Emulates trusted PostgREST JWT claim injection.
-- A client-controlled GUC is NOT trustworthy in isolation; actual Supabase JWT
-- verification and trusted role switch must be validated before any deployment.
CREATE ROLE v2_jwt_authenticated NOLOGIN;
CREATE ROLE v2_jwt_anon NOLOGIN;
CREATE FUNCTION v2_real.jwt_fixture_buyer()
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path=''
AS $$
DECLARE raw text;
BEGIN
 IF current_user <> 'v2_jwt_authenticated' THEN
   RAISE EXCEPTION 'not authenticated' USING ERRCODE='28000';
 END IF;
 raw:=current_setting('request.jwt.claim.sub',true);
 IF raw IS NULL OR raw='' THEN
   RAISE EXCEPTION 'missing JWT subject' USING ERRCODE='28000';
 END IF;
 RETURN raw::uuid;
EXCEPTION WHEN invalid_text_representation THEN
 RAISE EXCEPTION 'invalid JWT subject' USING ERRCODE='28000';
END $$;
CREATE FUNCTION v2_real.checkout_as_jwt(request uuid,cart jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE buyer uuid;
BEGIN
 -- SECURITY DEFINER changes current_user to owner, so inspect trusted
 -- session role via role settings rather than current_user in this fixture.
 IF session_user <> 'v2_jwt_authenticated' THEN
   RAISE EXCEPTION 'unauthorized role' USING ERRCODE='28000';
 END IF;
 buyer:=current_setting('request.jwt.claim.sub',true)::uuid;
 IF buyer IS NULL THEN RAISE EXCEPTION 'missing buyer' USING ERRCODE='28000'; END IF;
 RETURN v2_real.checkout(buyer,request,cart);
END $$;
REVOKE ALL ON FUNCTION v2_real.checkout_as_jwt(uuid,jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA v2_real TO v2_jwt_authenticated,v2_jwt_anon;
GRANT EXECUTE ON FUNCTION v2_real.checkout_as_jwt(uuid,jsonb) TO v2_jwt_authenticated,v2_jwt_anon;
-- Verify that anonymous role is rejected even if it forges the subject GUC.
SET SESSION AUTHORIZATION v2_jwt_anon;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $$
BEGIN
 BEGIN
   PERFORM v2_real.checkout_as_jwt('00000000-0000-0000-0000-000000000051','[]'::jsonb);
   RAISE EXCEPTION 'anonymous request accepted';
 EXCEPTION WHEN invalid_authorization_specification THEN NULL;
 END;
END $$;
RESET SESSION AUTHORIZATION;
-- Test deliberately does not assert an authenticated positive path: local
-- role simulation cannot prove JWT signature or claim provenance.
-- DO NOT EXPOSE THIS RPC IN STAGING OR PRODUCTION.
