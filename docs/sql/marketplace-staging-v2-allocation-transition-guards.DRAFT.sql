-- Echoes Marketplace V2 synthetic seller allocation lifecycle
-- REVIEW ONLY. NOT EXECUTABLE. No staging or production deployment.
-- Requires the V2 allocation table and reconciliation trigger.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 allocation lifecycle guards not approved';
END
$review$;

BEGIN;
CREATE FUNCTION ec_wallet.v2_guard_allocation_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'V2 seller allocations cannot be deleted';
  END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.state<>'pending' OR NEW.voided_at IS NOT NULL THEN
      RAISE EXCEPTION 'V2 allocations must begin pending';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.allocation_id,NEW.order_id,NEW.seller_id,NEW.currency_code,
      NEW.gross_ec,NEW.seller_ec,NEW.humanitarian_ec,NEW.operating_ec,
      NEW.created_at)
     IS DISTINCT FROM
     (OLD.allocation_id,OLD.order_id,OLD.seller_id,OLD.currency_code,
      OLD.gross_ec,OLD.seller_ec,OLD.humanitarian_ec,OLD.operating_ec,
      OLD.created_at) THEN
    RAISE EXCEPTION 'V2 allocation identity and amounts are immutable';
  END IF;

  IF OLD.state<>'pending' OR OLD.voided_at IS NOT NULL
     OR NEW.state<>'voided' OR NEW.voided_at IS NULL THEN
    RAISE EXCEPTION 'Illegal V2 allocation transition';
  END IF;

  -- Require the owning order to be locked by the cancellation RPC.
  -- This trigger alone cannot prove that a valid ledger reversal exists;
  -- the final RPC and ledger reconciliation must enforce that condition.
  PERFORM 1 FROM ec_wallet.staging_cart_orders_v2 o
   WHERE o.order_id=NEW.order_id AND o.status='created'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation can only be voided during order cancellation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER v2_allocation_insert_guard
BEFORE INSERT ON ec_wallet.staging_cart_seller_allocations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_allocation_mutation();

CREATE TRIGGER v2_allocation_update_delete_guard
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_seller_allocations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_allocation_mutation();

REVOKE ALL ON FUNCTION ec_wallet.v2_guard_allocation_mutation()
FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- REVIEW GATES:
-- This guard only protects row immutability and one-way transitions.
-- It does not prevent privileged direct SQL writes or prove the EC reversal.
-- Parent order lock ordering must be tested for deadlocks.
-- The cancellation RPC must void allocations before setting order cancelled.
-- Allocation reconciliation remains separate; neither guard is a payout.
