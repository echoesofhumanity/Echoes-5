-- Echoes Marketplace V2 / UNSPLIT-TEST-ONLY-v0
-- REVIEW ONLY. DO NOT RUN on staging, production, or any connected database.
-- No real EC ledger, seller payout, entitlement or external wallet linkage.
-- This file intentionally raises BEFORE any transaction or DDL.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: isolated V2 synthetic wallet/journal DDL is not approved for installation';
END
$review$;

BEGIN;

-- Dedicated test wallet; owner UUID is synthetic fixture identity only.
-- No FK to ec_wallet.wallets or auth.users; no balance bridge to legacy EC.
CREATE TABLE ec_wallet.staging_v2_test_wallets (
  wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_buyer_id uuid NOT NULL UNIQUE,
  opening_ec bigint NOT NULL CHECK (opening_ec >= 0 AND opening_ec <= 9007199254740991),
  balance_ec bigint NOT NULL CHECK (balance_ec >= 0 AND balance_ec <= 9007199254740991),
  test_only boolean NOT NULL DEFAULT true CHECK (test_only IS TRUE),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT v2_test_wallet_initial_balance CHECK (opening_ec >= 0)
);

-- Only a test-only V2 order may be referenced; requires separately reviewed
-- V2 order schema to exist. No direct references to legacy wallet/ledger.
CREATE TABLE ec_wallet.staging_v2_test_journal (
  entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES ec_wallet.staging_v2_test_wallets(wallet_id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES ec_wallet.staging_cart_orders_v2(order_id) ON DELETE RESTRICT,
  operation text NOT NULL CHECK (operation IN ('checkout_debit','checkout_reversal')),
  delta_ec bigint NOT NULL CHECK (
    (operation='checkout_debit' AND delta_ec < 0)
    OR (operation='checkout_reversal' AND delta_ec > 0)
  ),
  request_key uuid NOT NULL,
  test_only boolean NOT NULL DEFAULT true CHECK (test_only IS TRUE),
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (wallet_id, request_key),
  UNIQUE (wallet_id, order_id, operation)
);

CREATE INDEX staging_v2_test_journal_order_idx
  ON ec_wallet.staging_v2_test_journal(order_id);

ALTER TABLE ec_wallet.staging_v2_test_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_v2_test_wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_v2_test_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_v2_test_journal FORCE ROW LEVEL SECURITY;

REVOKE ALL ON ec_wallet.staging_v2_test_wallets FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ec_wallet.staging_v2_test_journal FROM PUBLIC, anon, authenticated, service_role;

-- Test-wallet initialization must start at the opening balance.
-- Later balance changes are reserved for a separately reviewed, controlled RPC.
CREATE FUNCTION ec_wallet.v2_guard_test_wallet_initialization()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $wallet_guard$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.balance_ec IS DISTINCT FROM NEW.opening_ec THEN
    RAISE EXCEPTION 'Synthetic wallet opening balance mismatch';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Synthetic wallet deletion prohibited';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.wallet_id IS DISTINCT FROM OLD.wallet_id OR
    NEW.fixture_buyer_id IS DISTINCT FROM OLD.fixture_buyer_id OR
    NEW.opening_ec IS DISTINCT FROM OLD.opening_ec OR
    NEW.test_only IS DISTINCT FROM OLD.test_only OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Synthetic wallet immutable fields changed';
  END IF;
  RETURN NEW;
END
$wallet_guard$;
CREATE TRIGGER staging_v2_test_wallet_guard
  BEFORE INSERT OR UPDATE OR DELETE ON ec_wallet.staging_v2_test_wallets
  FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_test_wallet_initialization();

-- Defense in depth: journal append-only, including against normal SQL writers.
-- Privileged table owners/superusers still require independent operational controls.
CREATE FUNCTION ec_wallet.v2_reject_test_journal_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $guard$
BEGIN
  RAISE EXCEPTION 'Synthetic journal rows are immutable';
END
$guard$;
CREATE TRIGGER staging_v2_test_journal_no_mutation
  BEFORE UPDATE OR DELETE ON ec_wallet.staging_v2_test_journal
  FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_reject_test_journal_mutation();

-- REVIEW BLOCKERS:
-- 1. Wallet opening equality is guarded at INSERT; balance UPDATE is not yet
--    limited to a trusted RPC, and must not be exposed to clients.
-- 2. opening balance + SUM(journal deltas) = current balance needs deferred
--    reconciliation and a trusted single-writer transaction contract.
-- 3. RLS policies and SECURITY DEFINER RPC privileges are intentionally absent.
-- 4. No SQL grants or execution authority for any caller are supplied.
-- 5. Do not remove the initial review guard to "activate" this draft.
-- 6. The referenced V2 order table is NOT installed in staging.
-- 7. Table-level TRUNCATE must be revoked/blocked by approved ownership rules.
COMMIT;
