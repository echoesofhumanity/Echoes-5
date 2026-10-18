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

-- REVIEW-ONLY deferred order/clearing reconciliation candidate.
-- The top-level review guard remains in place: none of this is deployable.
CREATE FUNCTION ec_wallet.v2_assert_unsplit_clearing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_order_id uuid;
  v_order ec_wallet.staging_cart_orders_v2%ROWTYPE;
  v_count bigint;
  v_amount numeric;
  v_bad_count bigint;
BEGIN
  IF TG_TABLE_SCHEMA <> 'ec_wallet'
     OR TG_TABLE_NAME NOT IN ('staging_cart_orders_v2','staging_cart_unsplit_clearing_v2') THEN
    RAISE EXCEPTION 'Unexpected clearing trigger source';
  END IF;
  v_order_id := NEW.order_id;
  SELECT o.* INTO v_order
  FROM ec_wallet.staging_cart_orders_v2 o WHERE o.order_id=v_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clearing order missing';
  END IF;
  SELECT count(*),coalesce(sum(c.amount_ec::numeric),0),
         count(*) FILTER (WHERE c.currency_code<>'EC'
             OR c.policy_code<>'UNSPLIT-TEST-ONLY-v0'
             OR c.test_only IS DISTINCT FROM true
             OR (v_order.status='created' AND c.state<>'pending')
             OR (v_order.status='cancelled' AND c.state<>'voided'))
  INTO v_count,v_amount,v_bad_count
  FROM ec_wallet.staging_cart_unsplit_clearing_v2 c
  WHERE c.order_id=v_order_id;
  IF v_count<>1 OR v_amount<>v_order.total_ec::numeric OR v_bad_count<>0 THEN
    RAISE EXCEPTION 'V2 unallocated clearing/order mismatch';
  END IF;
  RETURN NULL;
END
$fn$;

CREATE CONSTRAINT TRIGGER v2_unsplit_check_order
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_orders_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_unsplit_clearing();

CREATE CONSTRAINT TRIGGER v2_unsplit_check_clearing
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_unsplit_clearing_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_unsplit_clearing();

REVOKE ALL ON FUNCTION ec_wallet.v2_assert_unsplit_clearing()
FROM PUBLIC,anon,authenticated,service_role;

-- Implemented above as an unexecuted review candidate: one clearing row,
-- matching order amount and status. Ledger debit/reversal checks remain separate,
-- and privileged writer / TRUNCATE protections require independent review.
-- Existing allocation reconciliation is incompatible with this model:
-- it MUST NOT be installed alongside this candidate without a reviewed
-- mutually exclusive migration manifest and replacement invariants.
-- No standalone INSERT/UPDATE RPC or grants are supplied.
COMMIT;

-- 2026-10-19 REVIEW FINDING / CHECKOUT-CANCEL INTEGRATION BLOCKER:
-- The deferred order/clearing trigger checks final order status and clearing
-- state, but is not a complete authorization or accounting mechanism.
-- Integration MUST also prove exactly one buyer debit, exactly one created
-- event, and on cancellation exactly one matching reversal and cancelled event.
-- The ledger/event reconciliation DRAFT supplies a candidate for those proofs,
-- but its V2 operation names are excluded by the current ledger CHECK.
-- Existing seller-allocation reconciliation must be EXCLUDED from the
-- UNSPLIT-TEST-ONLY migration manifest; do not install both models.
-- A single transaction must write order, lines, reservation, stock, buyer
-- debit, unallocated pending clearing and event; cancellation must reverse
-- all affected records together. Any error must roll back all writes.
-- Never remove the top-level RAISE EXCEPTION as a shortcut to activation.
-- No SQL execution, staging writes or production changes are authorized.
