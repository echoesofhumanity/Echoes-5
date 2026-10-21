-- LOCAL ONLY: install V2 core then JWT-bound public wrappers.
-- Never deploy this test fixture as a migration.
REVOKE ALL ON SCHEMA echoes_v2_synthetic FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA echoes_v2_synthetic FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA echoes_v2_synthetic FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.v2_real_test_checkout(request uuid, cart jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE buyer uuid:=auth.uid();
BEGIN
 IF buyer IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000'; END IF;
 RETURN echoes_v2_synthetic.checkout(buyer,request,cart);
END $$;
CREATE OR REPLACE FUNCTION public.v2_real_test_cancel(order_id uuid, request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE buyer uuid:=auth.uid();
BEGIN
 IF buyer IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000'; END IF;
 PERFORM echoes_v2_synthetic.cancel(buyer,order_id,request);
END $$;
REVOKE ALL ON FUNCTION public.v2_real_test_checkout(uuid,jsonb),public.v2_real_test_cancel(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v2_real_test_checkout(uuid,jsonb),public.v2_real_test_cancel(uuid,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
