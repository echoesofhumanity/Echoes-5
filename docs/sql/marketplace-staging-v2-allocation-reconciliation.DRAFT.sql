-- Echoes Marketplace V2: synthetic allocation reconciliation guards
-- REVIEW ONLY; DO NOT EXECUTE; no staging/production changes.
-- Depends on staging_cart_seller_allocations_v2 and V2 order/line tables.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 allocation reconciliation not approved';
END
$review$;

BEGIN;
-- Deferred reconciliation: permits line and allocation inserts in any order
-- within one transaction, but rejects commit if any seller allocation is
-- missing, inflated, or assigned to a seller without order lines.
CREATE FUNCTION ec_wallet.v2_assert_allocation_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
DECLARE
  v_order_id uuid;
  v_total bigint;
  v_line_total numeric;
  v_allocation_total numeric;
  v_seller_count bigint;
  v_bad_seller_count bigint;
BEGIN
  v_order_id := NEW.order_id;
  SELECT o.total_ec INTO v_total
    FROM ec_wallet.staging_cart_orders_v2 o WHERE o.order_id=v_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 allocation order missing';
  END IF;
  SELECT coalesce(sum(l.subtotal_ec::numeric),0)
    INTO v_line_total FROM ec_wallet.staging_cart_order_lines_v2 l
    WHERE l.order_id=v_order_id;
  SELECT coalesce(sum(a.gross_ec::numeric),0),count(*)
    INTO v_allocation_total,v_seller_count
    FROM ec_wallet.staging_cart_seller_allocations_v2 a
    WHERE a.order_id=v_order_id;
  SELECT count(*) INTO v_bad_seller_count
    FROM (
      SELECT l.seller_id,sum(l.subtotal_ec::numeric) AS gross
      FROM ec_wallet.staging_cart_order_lines_v2 l
      WHERE l.order_id=v_order_id GROUP BY l.seller_id
    ) expected
    FULL JOIN (
      SELECT a.seller_id,sum(a.gross_ec::numeric) AS gross
      FROM ec_wallet.staging_cart_seller_allocations_v2 a
      WHERE a.order_id=v_order_id GROUP BY a.seller_id
    ) actual USING (seller_id)
    WHERE expected.seller_id IS NULL OR actual.seller_id IS NULL
      OR expected.gross <> actual.gross;
  -- Gross totals alone do not prove that every allocation component is
  -- balanced. Numeric casts avoid bigint overflow in aggregate arithmetic.
  IF EXISTS (
    SELECT 1 FROM ec_wallet.staging_cart_seller_allocations_v2 a
    WHERE a.order_id=v_order_id
      AND (a.seller_ec::numeric + a.humanitarian_ec::numeric
           + a.operating_ec::numeric <> a.gross_ec::numeric
           OR a.operating_ec::numeric * 100 > a.gross_ec::numeric * 3)
  ) THEN
    RAISE EXCEPTION 'V2 allocation components unbalanced or operating cap exceeded';
  END IF;
  IF v_seller_count=0 OR v_total::numeric<>v_line_total
     OR v_total::numeric<>v_allocation_total OR v_bad_seller_count<>0 THEN
    RAISE EXCEPTION 'V2 allocation/line/order totals do not reconcile';
  END IF;
  RETURN NULL;
END
$fn$;

-- Every V2 checkout must insert an order event. This deferred trigger checks
-- at commit; it is not a substitute for ledger-debit or double-entry checks.
CREATE CONSTRAINT TRIGGER v2_allocation_check_on_order
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_orders_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_allocation_totals();

CREATE CONSTRAINT TRIGGER v2_allocation_check_on_line
AFTER INSERT ON ec_wallet.staging_cart_order_lines_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_allocation_totals();

CREATE CONSTRAINT TRIGGER v2_allocation_check_on_allocation
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_seller_allocations_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_allocation_totals();

REVOKE ALL ON FUNCTION ec_wallet.v2_assert_allocation_totals()
FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- REVIEW BLOCKERS:
-- 1. Amount splits (seller/humanitarian/operating) need approved policy.
-- 2. Allocation identity/amount immutability and guarded void transition
--    still require triggers.
-- 3. Concurrent mutations require parent-order locking and tests; deferred
--    aggregate checks alone are not concurrency-proof.
-- 4. V2 debit operation is absent from existing ledger CHECK; approved
--    migration, wallet-global idempotency and reconciliation still required.
-- 5. No real payout, real payment, or user-executable checkout is enabled.
