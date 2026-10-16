-- Echoes Marketplace v2: supplemental integrity controls
-- REVIEW DRAFT ONLY. DO NOT EXECUTE. Depends on the base v2 draft.
-- These checks are necessary but NOT sufficient for checkout authorization.
BEGIN;

-- A protected event history must be append-only, including for privileged
-- application routines. Superusers/table owners can still alter DDL.
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
  v_order_id := CASE WHEN TG_TABLE_NAME = 'staging_cart_orders_v2'
                     THEN NEW.order_id ELSE NEW.order_id END;
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

COMMIT;

-- Remaining gates: parent-row serialization under concurrent writes,
-- seller/product ownership, lifecycle and reservation transitions,
-- verified server-only RPC, balanced ledger and adversarial staging tests.
