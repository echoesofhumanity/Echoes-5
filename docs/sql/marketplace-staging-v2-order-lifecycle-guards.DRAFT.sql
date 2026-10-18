-- Echoes Marketplace V2 / order-header lifecycle guard
-- REVIEW DRAFT ONLY; DO NOT EXECUTE ON STAGING OR PRODUCTION.
-- Depends on docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql.
-- Intentionally blocked before DDL; requires explicit migration approval.
DO $$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 order lifecycle migration not approved';
END $$;

BEGIN;
CREATE FUNCTION ec_wallet.v2_guard_order_header_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'V2 orders cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'created' OR NEW.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION 'V2 orders must start as created';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.order_id,NEW.buyer_id,NEW.idempotency_key,NEW.request_digest,
      NEW.currency_code,NEW.total_ec,NEW.created_at)
     IS DISTINCT FROM
     (OLD.order_id,OLD.buyer_id,OLD.idempotency_key,OLD.request_digest,
      OLD.currency_code,OLD.total_ec,OLD.created_at) THEN
    RAISE EXCEPTION 'V2 order identity and amount are immutable';
  END IF;

  IF OLD.status <> 'created' OR NEW.status <> 'cancelled'
     OR OLD.cancelled_at IS NOT NULL OR NEW.cancelled_at IS NULL THEN
    RAISE EXCEPTION 'Illegal V2 order status transition';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION ec_wallet.v2_guard_order_header_mutation()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER v2_order_header_insert_guard
BEFORE INSERT ON ec_wallet.staging_cart_orders_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_order_header_mutation();

CREATE TRIGGER v2_order_header_transition_guard
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_orders_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_order_header_mutation();
COMMIT;

-- This guard does not authorize cancellation or prove EC refund.
-- Mandatory server-owned cancel RPC contract (not implemented here):
-- 1. auth.uid() buyer ownership, wallet FOR UPDATE, order FOR UPDATE.
-- 2. Confirm original checkout debit and no prior V2 reversal.
-- 3. Lock relevant product rows in deterministic UUID order.
-- 4. Verify all reservations are reserved and eligible for cancellation;
--    consumed reservations are NOT automatically restocked/refunded.
-- 5. Transition each reservation once to released; restore each stock unit once.
-- 6. Insert exactly one positive reversal with SAME order reference ID,
--    distinct reversal idempotency key and ledger uniqueness enforcement.
-- 7. Insert exactly one cancellation event, void synthetic payables,
--    update order status in the SAME database transaction.
-- 8. Repeated cancellation must replay the prior result without writes.
-- 9. Any failure rolls back ALL changes; no network calls while locked.
-- 10. Reconcile order total, original debit, reversal and restored quantity.
--
-- IMPORTANT: Existing order status enum only supports created/cancelled.
-- Reservation expiration and consumption require a separately approved
-- lifecycle policy; this draft MUST NOT implement expiry-based auto-refunds.
-- Requires review of earlier integrity/reservation drafts to avoid duplicate
-- line/event triggers when assembling a final migration.
