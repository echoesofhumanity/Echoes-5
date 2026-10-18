-- ECHOES MARKETPLACE V2 / CONSOLIDATED INTEGRITY GUARDS
-- REVIEW-ONLY ASSEMBLY CANDIDATE, 18 OCT 2026.
-- NEVER EXECUTE ON STAGING OR PRODUCTION WITHOUT EXPLICIT APPROVAL.
-- Prerequisites: independent V2 catalogue, then multi-item V2 schema.
-- Replaces (DO NOT also apply) the three separate integrity/reservation/header drafts.
-- DOES NOT implement checkout, cancellation, ledger posting, expiry or payout.
-- Fail-closed guard: abort before any DDL even if pasted into a SQL console.
DO $v2_review_block$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: consolidated V2 integrity guards not approved';
END
$v2_review_block$;

BEGIN;

-- ONE pair of immutable order-line/event triggers and deferred total assertions.
CREATE FUNCTION ec_wallet.staging_v2_reject_event_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'V2 order events are append-only'
    USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION ec_wallet.staging_v2_reject_event_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER staging_v2_order_events_immutable
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_order_events_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.staging_v2_reject_event_mutation();

-- Freeze all order-line snapshots after insert, including price and quantity.
-- Changes must be represented by new order lifecycle events, not row edits.
CREATE FUNCTION ec_wallet.staging_v2_reject_line_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'V2 order lines cannot be updated or deleted'
    USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION ec_wallet.staging_v2_reject_line_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER staging_v2_order_lines_immutable
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_order_lines_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.staging_v2_reject_line_mutation();

-- Deferred constraint triggers validate final order-line sum at transaction
-- commit. Allows order header and lines to be inserted in either order.
-- The future server RPC must lock the parent order before inserting lines
-- to serialize concurrent changes; this draft does not implement that RPC.
CREATE FUNCTION ec_wallet.staging_v2_assert_order_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_order_id uuid;
  v_expected bigint;
  v_actual numeric;
  v_count integer;
BEGIN
  -- Both order-header and line triggers use NEW.order_id; the parent
  -- header remains present because V2 order deletion is prohibited.
  v_order_id := NEW.order_id;
  SELECT o.total_ec INTO v_expected
    FROM ec_wallet.staging_cart_orders_v2 o
    WHERE o.order_id = v_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 order header missing'
      USING ERRCODE = '23514';
  END IF;
  SELECT count(*), coalesce(sum(l.subtotal_ec::numeric),0)
    INTO v_count,v_actual
    FROM ec_wallet.staging_cart_order_lines_v2 l
    WHERE l.order_id = v_order_id;
  IF v_count < 1 OR v_count > 50 OR v_actual <> v_expected THEN
    RAISE EXCEPTION 'V2 order total does not match order lines'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION ec_wallet.staging_v2_assert_order_total()
  FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER staging_v2_total_on_order
AFTER INSERT OR UPDATE ON ec_wallet.staging_cart_orders_v2
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ec_wallet.staging_v2_assert_order_total();

CREATE CONSTRAINT TRIGGER staging_v2_total_on_line
AFTER INSERT ON ec_wallet.staging_cart_order_lines_v2
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ec_wallet.staging_v2_assert_order_total();

-- Reservation insert and one-way transition guards (no duplicate immutability triggers).
CREATE FUNCTION ec_wallet.v2_guard_reservation_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_line_quantity integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'V2 reservations cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'reserved'
       OR NEW.released_at IS NOT NULL OR NEW.consumed_at IS NOT NULL
       OR NEW.release_reason IS NOT NULL THEN
      RAISE EXCEPTION 'V2 reservations must be inserted as reserved';
    END IF;
    SELECT l.quantity INTO v_line_quantity
    FROM ec_wallet.staging_cart_order_lines_v2 AS l
    WHERE l.line_id = NEW.line_id
      AND l.order_id = NEW.order_id AND l.product_id = NEW.product_id;
    IF v_line_quantity IS NULL OR v_line_quantity <> NEW.quantity THEN
      RAISE EXCEPTION 'Reservation quantity does not match immutable order line';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.reservation_id, NEW.line_id, NEW.order_id, NEW.product_id,
      NEW.quantity, NEW.reserved_at, NEW.expires_at)
     IS DISTINCT FROM
     (OLD.reservation_id, OLD.line_id, OLD.order_id, OLD.product_id,
      OLD.quantity, OLD.reserved_at, OLD.expires_at) THEN
    RAISE EXCEPTION 'V2 reservation identity and quantity are immutable';
  END IF;

  IF OLD.state <> 'reserved'
     OR NEW.state NOT IN ('released','consumed') THEN
    RAISE EXCEPTION 'Illegal V2 reservation transition';
  END IF;

  IF NEW.state = 'released' THEN
    IF NEW.released_at IS NULL OR NEW.consumed_at IS NOT NULL
       OR NEW.release_reason NOT IN ('order_cancelled','reservation_expired') THEN
      RAISE EXCEPTION 'Invalid reservation release';
    END IF;
  ELSIF NEW.state = 'consumed' THEN
    IF NEW.consumed_at IS NULL OR NEW.released_at IS NOT NULL
       OR NEW.release_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid reservation consumption';
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION ec_wallet.v2_guard_reservation_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER v2_reservation_insert_guard
BEFORE INSERT ON ec_wallet.staging_inventory_reservations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_reservation_mutation();

CREATE TRIGGER v2_reservation_transition_guard
BEFORE UPDATE OR DELETE ON ec_wallet.staging_inventory_reservations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_reservation_mutation();

-- Order header insert and created -> cancelled guard.
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

-- SECURITY / IMPLEMENTATION GATES:
-- * Do not remove guard without separate review, approval and staging-only migration.
-- * All functions use fixed empty search_path; audit EXECUTE/default PUBLIC grants.
-- * Trigger guards are not a substitute for atomic server-owned RPCs.
-- * Service-role direct INSERT to ledger remains an unresolved isolation risk.
-- * SECURITY NOTE: INSERT on event/line/order tables is still protected by grants
--   and future server-owned RPCs, not by immutable UPDATE/DELETE triggers.
-- * REVOKE of trigger function EXECUTE does not prevent privileged owners from
--   modifying triggers; review schema CREATE and service_role privileges.
-- * No automated expiry or consumed-order cancellation is authorized.
-- * Test constraint-trigger order totals, last-stock race, duplicate idempotency,
--   one reversal per order, failure rollback, and legacy checkout regression.
