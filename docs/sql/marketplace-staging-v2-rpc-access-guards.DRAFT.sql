-- Echoes Marketplace V2 / RPC access hardening
-- REVIEW DRAFT ONLY. DO NOT EXECUTE ON STAGING OR PRODUCTION.
-- Depends on approved V2 tables and reviewed RPC implementations.
-- Deliberately DOES NOT create a callable stub, ledger writer or SECURITY DEFINER function.
-- A callable placeholder could be mistaken for operational checkout.
--
-- Expected FUTURE signatures (not created here):
-- public.ec_staging_cart_checkout_v2(jsonb,uuid)
-- public.ec_staging_cart_cancel_v2(uuid)
--
-- Prerequisites BEFORE applying the statements below:
-- 1. Approve real, complete implementations with auth.uid() ownership checks,
--    fixed SET search_path = '', schema-qualified references and bounded payload.
-- 2. Review SECURITY DEFINER owner, schema USAGE, grants and all function overloads.
-- 3. Confirm V2 ledger operation codes, idempotency, seller status, lock order,
--    rollback, immutable snapshots and stock/EC reconciliation.
-- 4. Verify RPC signatures exist exactly once; audit default EXECUTE grants.
--
-- NOT EXECUTABLE AS-IS: intentional guard prevents accidental execution.
-- Remove the guard only in a separately approved migration.
DO $$
BEGIN
  RAISE EXCEPTION 'REVIEW DRAFT ONLY: V2 RPC grants require explicit approval';
END $$;

BEGIN;
-- Explicitly remove default function execution exposure on reviewed V2 RPCs.
REVOKE ALL ON FUNCTION public.ec_staging_cart_checkout_v2(jsonb,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.ec_staging_cart_cancel_v2(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated callers only, after server-side authorization review.
GRANT EXECUTE ON FUNCTION public.ec_staging_cart_checkout_v2(jsonb,uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ec_staging_cart_cancel_v2(uuid)
  TO authenticated;
COMMIT;

-- No existing legacy RPC or table grants are modified.
-- The explicit guard also means this file is NOT a migration candidate until revised.
