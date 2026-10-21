-- Disposable local Supabase only. Minimal API ownership boundary, NOT production V2.
CREATE TABLE public.v2_api_test_wallets (
 buyer uuid PRIMARY KEY, balance integer NOT NULL DEFAULT 100 CHECK (balance>=0)
);
CREATE TABLE public.v2_api_test_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer uuid NOT NULL REFERENCES public.v2_api_test_wallets(buyer),
 amount integer NOT NULL CHECK(amount>0), status text NOT NULL DEFAULT 'created'
 CHECK(status IN ('created','cancelled'))
);
ALTER TABLE public.v2_api_test_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_api_test_wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_api_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_api_test_orders FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.v2_api_test_wallets,public.v2_api_test_orders FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.v2_api_test_checkout(amount integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); oid uuid;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000'; END IF;
 IF amount IS NULL OR amount<1 OR amount>100 THEN RAISE EXCEPTION 'invalid amount'; END IF;
 INSERT INTO public.v2_api_test_wallets(buyer) VALUES(who) ON CONFLICT DO NOTHING;
 UPDATE public.v2_api_test_wallets SET balance=balance-amount WHERE buyer=who AND balance>=amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'insufficient balance'; END IF;
 INSERT INTO public.v2_api_test_orders(buyer,amount) VALUES(who,amount) RETURNING id INTO oid;
 RETURN oid;
END $$;
CREATE OR REPLACE FUNCTION public.v2_api_test_cancel(order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); amt integer;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='28000'; END IF;
 UPDATE public.v2_api_test_orders SET status='cancelled'
 WHERE id=order_id AND buyer=who AND status='created' RETURNING amount INTO amt;
 IF NOT FOUND THEN RAISE EXCEPTION 'order not found or not cancellable'; END IF;
 UPDATE public.v2_api_test_wallets SET balance=balance+amt WHERE buyer=who;
END $$;
REVOKE ALL ON FUNCTION public.v2_api_test_checkout(integer),public.v2_api_test_cancel(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v2_api_test_checkout(integer),public.v2_api_test_cancel(uuid) TO authenticated;
