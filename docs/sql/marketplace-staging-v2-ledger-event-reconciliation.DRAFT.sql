-- Echoes Marketplace V2 / cross-object ledger and event reconciliation
-- REVIEW ONLY: do not execute on staging or production.
-- Requires V2 orders, events, wallet and ledger tables and approved V2 ledger codes.
-- No balanced double-entry liability journal is implemented by this draft.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 ledger/event reconciliation not approved';
END
$review$;

BEGIN;
CREATE FUNCTION ec_wallet.v2_assert_order_ledger_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_order_id uuid;
  v_order ec_wallet.staging_cart_orders_v2%ROWTYPE;
  v_wallet_id uuid;
  v_wallet_count bigint;
  v_debit_count bigint;
  v_debit_sum numeric;
  v_reversal_count bigint;
  v_reversal_sum numeric;
  v_created_count bigint;
  v_cancelled_count bigint;
BEGIN
  IF TG_TABLE_SCHEMA='ec_wallet' AND TG_TABLE_NAME='ledger' THEN
    IF NEW.operation NOT IN ('cart_checkout_debit_v2','cart_checkout_reversal_v2') THEN
      RETURN NULL;
    END IF;
    v_order_id := NEW.reference_id;
  ELSIF TG_TABLE_SCHEMA='ec_wallet'
        AND TG_TABLE_NAME IN ('staging_cart_orders_v2','staging_cart_order_events_v2') THEN
    v_order_id := NEW.order_id;
  ELSE
    RAISE EXCEPTION 'Unexpected V2 reconciliation trigger source';
  END IF;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'V2 reconciliation reference is missing';
  END IF;

  SELECT o.* INTO v_order
    FROM ec_wallet.staging_cart_orders_v2 o WHERE o.order_id=v_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 ledger/event evidence references missing order';
  END IF;
  -- A V2 ledger entry must belong to the order buyer's wallet, not merely
  -- share the order UUID. Reject wrong-wallet entries, including privileged
  -- direct inserts, when the ledger INSERT trigger fires.
  IF TG_TABLE_SCHEMA='ec_wallet' AND TG_TABLE_NAME='ledger'
     AND NEW.operation IN ('cart_checkout_debit_v2','cart_checkout_reversal_v2')
     AND NOT EXISTS (
       SELECT 1 FROM ec_wallet.wallets w
       WHERE w.wallet_id=NEW.wallet_id AND w.owner_id=v_order.buyer_id
     ) THEN
    RAISE EXCEPTION 'V2 ledger entry wallet does not belong to order buyer';
  END IF;

  SELECT count(*),max(w.wallet_id) INTO v_wallet_count,v_wallet_id
    FROM ec_wallet.wallets w WHERE w.owner_id=v_order.buyer_id;
  IF v_wallet_count<>1 THEN
    RAISE EXCEPTION 'V2 buyer wallet evidence ambiguous or absent';
  END IF;

  SELECT count(*),coalesce(sum(l.delta_ec::numeric),0)
    INTO v_debit_count,v_debit_sum
    FROM ec_wallet.ledger l
   WHERE l.wallet_id=v_wallet_id AND l.reference_id=v_order_id
     AND l.operation='cart_checkout_debit_v2';
  SELECT count(*),coalesce(sum(l.delta_ec::numeric),0)
    INTO v_reversal_count,v_reversal_sum
    FROM ec_wallet.ledger l
   WHERE l.wallet_id=v_wallet_id AND l.reference_id=v_order_id
     AND l.operation='cart_checkout_reversal_v2';
  -- Cross-wallet entries must not be silently ignored by buyer-wallet sums.
  -- This also catches invalid V2 rows already present before an order update.
  IF EXISTS (
    SELECT 1 FROM ec_wallet.ledger l
    WHERE l.reference_id=v_order_id
      AND l.operation IN ('cart_checkout_debit_v2','cart_checkout_reversal_v2')
      AND l.wallet_id IS DISTINCT FROM v_wallet_id
  ) THEN
    RAISE EXCEPTION 'V2 ledger evidence contains foreign-wallet entries';
  END IF;
  SELECT count(*) FILTER (WHERE e.event_type='created'),
         count(*) FILTER (WHERE e.event_type='cancelled')
    INTO v_created_count,v_cancelled_count
    FROM ec_wallet.staging_cart_order_events_v2 e
   WHERE e.order_id=v_order_id;

  IF v_debit_count<>1 OR v_debit_sum<>-v_order.total_ec::numeric
     OR v_created_count<>1 THEN
    RAISE EXCEPTION 'V2 original debit or creation event mismatch';
  END IF;
  IF v_order.status='created' THEN
    IF v_reversal_count<>0 OR v_reversal_sum<>0 OR v_cancelled_count<>0 THEN
      RAISE EXCEPTION 'V2 created order has cancellation evidence';
    END IF;
  ELSIF v_order.status='cancelled' THEN
    IF v_reversal_count<>1 OR v_reversal_sum<>v_order.total_ec::numeric
       OR v_cancelled_count<>1 THEN
      RAISE EXCEPTION 'V2 cancelled order lacks reversal/event';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unexpected V2 order status';
  END IF;
  RETURN NULL;
END
$fn$;

-- Deferred triggers observe final state at transaction commit, allowing
-- checkout/cancellation writes in one transaction in different statement order.
CREATE CONSTRAINT TRIGGER v2_ledger_event_on_order
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_orders_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_order_ledger_events();

CREATE CONSTRAINT TRIGGER v2_ledger_event_on_event
AFTER INSERT ON ec_wallet.staging_cart_order_events_v2
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_order_ledger_events();

CREATE CONSTRAINT TRIGGER v2_ledger_event_on_ledger
AFTER INSERT ON ec_wallet.ledger
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ec_wallet.v2_assert_order_ledger_events();

REVOKE ALL ON FUNCTION ec_wallet.v2_assert_order_ledger_events()
  FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- REVIEW BLOCKERS:
-- 1. SECURITY DEFINER owner and privileges must be audited; trigger function
--    is not an authorization boundary against privileged writers.
-- 2. Existing ledger operation CHECK excludes V2 codes.
-- 3. Existing legacy ledger schema/trigger permissions must be inspected
--    before attaching a trigger to ec_wallet.ledger.
-- 4. Foreign-wallet V2 entries are rejected by this candidate trigger,
--    but privileged trigger bypass and concurrent writers still need tests.
-- 5. Reservation/allocations reconciliation remains separate.
-- 6. No SQL has been executed or permission to deploy granted.
