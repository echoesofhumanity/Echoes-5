-- Echoes Marketplace V2 / UNSPLIT-TEST-ONLY v0 clearing candidate
-- REVIEW DRAFT ONLY. NEVER EXECUTE ON STAGING OR PRODUCTION.
-- User approved temporary unallocated synthetic accounting DESIGN,
-- not migration, ledger posting, entitlement or economic percentages.
-- Independent V2 orders required; no seller allocations are awarded.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 unsplit synthetic clearing not approved for installation';
END
$review$;

BEGIN;

CREATE TABLE ec_wallet.staging_cart_unsplit_clearing_v2 (
  clearing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE
    REFERENCES ec_wallet.staging_cart_orders_v2(order_id) ON DELETE RESTRICT,
  amount_ec bigint NOT NULL CHECK (amount_ec > 0 AND amount_ec <= 9007199254740991),
  currency_code text NOT NULL DEFAULT 'EC' CHECK (currency_code = 'EC'),
  policy_code text NOT NULL DEFAULT 'UNSPLIT-TEST-ONLY-v0'
    CHECK (policy_code = 'UNSPLIT-TEST-ONLY-v0'),
  test_only boolean NOT NULL DEFAULT true CHECK (test_only),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','voided')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  voided_at timestamptz,
  CONSTRAINT v2_unsplit_void_consistency CHECK (
    (state='pending' AND voided_at IS NULL) OR
    (state='voided' AND voided_at IS NOT NULL)
  )
);

ALTER TABLE ec_wallet.staging_cart_unsplit_clearing_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ec_wallet.staging_cart_unsplit_clearing_v2
  FROM PUBLIC,anon,authenticated;

-- REVIEW CANDIDATE: one-way clearing state guard. Does not authorize writes.
CREATE FUNCTION ec_wallet.v2_unsplit_clearing_transition_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'V2 clearing deletion prohibited';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.clearing_id IS DISTINCT FROM OLD.clearing_id
       OR NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.amount_ec IS DISTINCT FROM OLD.amount_ec
       OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
       OR NEW.policy_code IS DISTINCT FROM OLD.policy_code
       OR NEW.test_only IS DISTINCT FROM OLD.test_only
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR OLD.state<>'pending' OR NEW.state<>'voided'
       OR OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL THEN
      RAISE EXCEPTION 'V2 clearing mutation not permitted';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER v2_unsplit_clearing_before_update_delete
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_unsplit_clearing_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_unsplit_clearing_transition_guard();

-- NOT IMPLEMENTED: deferred cross-object checks that enforce exactly one
-- clearing row per order, amount_ec=order.total_ec, pending iff created,
-- voided iff cancelled, and one original debit / one reversal as applicable.
-- Existing allocation reconciliation is incompatible with this model:
-- it MUST NOT be installed alongside this candidate without a reviewed
-- mutually exclusive migration manifest and replacement invariants.
-- No standalone INSERT/UPDATE RPC or grants are supplied.
COMMIT;
