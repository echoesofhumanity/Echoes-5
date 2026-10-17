-- Echoes Marketplace V2: immutable lines/events and reservation state transitions
-- REVIEW DRAFT ONLY. DO NOT EXECUTE ON STAGING OR PRODUCTION.
-- Dependency: approved independent V2 catalogue + multi-item schema.
-- Does not create a checkout/cancel RPC or permit client writes.
-- Not an authorization boundary against table owners, trigger disabling or service_role direct INSERT.
-- NOT EXECUTABLE AS-IS: guard intentionally fails before any DDL.
DO $$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: reservation guard migration not approved';
END $$;

BEGIN;
CREATE FUNCTION ec_wallet.v2_reject_order_line_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'V2 order lines are immutable';
END $$;

CREATE TRIGGER v2_order_lines_immutable
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_order_lines_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_reject_order_line_mutation();

CREATE FUNCTION ec_wallet.v2_reject_order_event_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'V2 order events are append-only';
END $$;

CREATE TRIGGER v2_order_events_append_only
BEFORE UPDATE OR DELETE ON ec_wallet.staging_cart_order_events_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_reject_order_event_mutation();

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

CREATE TRIGGER v2_reservation_insert_guard
BEFORE INSERT ON ec_wallet.staging_inventory_reservations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_reservation_mutation();

CREATE TRIGGER v2_reservation_transition_guard
BEFORE UPDATE OR DELETE ON ec_wallet.staging_inventory_reservations_v2
FOR EACH ROW EXECUTE FUNCTION ec_wallet.v2_guard_reservation_mutation();
COMMIT;

-- This guards row shape and one-way state transitions only.
-- It does NOT itself guarantee a ledger refund, stock restoration, expiry authorization,
-- cancellation ownership, event existence or concurrent exactly-once semantics.
-- Those require reviewed server-owned atomic RPCs and adversarial tests.
-- Further review: function CREATE privileges, idempotency, triggers on order header,
-- multi-row stock update and rollback behavior, direct INSERT privilege isolation.
