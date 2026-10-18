-- Echoes Marketplace V2 synthetic atomic cancellation candidate
-- REVIEW ONLY. NOT EXECUTABLE. No database changes have been made.
-- Depends on V2 order/line/reservation/allocations, consolidated guards,
-- V2 checkout ledger operation approval and tested lock protocol.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 cancellation not approved';
END
$review$;

BEGIN;
CREATE FUNCTION public.ec_staging_cart_cancel_v2(p_order_id uuid)
RETURNS TABLE(order_id uuid, cancelled boolean, replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE
  v_buyer uuid := auth.uid();
  v_wallet uuid;
  v_order ec_wallet.staging_cart_orders_v2%ROWTYPE;
  v_debit_count bigint;
  v_debit_amount numeric;
  v_reversal_count bigint;
  v_reversal_amount numeric;
  v_reservation record;
  v_rows integer;
  v_reversal_key uuid;
BEGIN
  IF v_buyer IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated buyer and order required' USING ERRCODE='28000';
  END IF;
  SELECT w.wallet_id INTO v_wallet FROM ec_wallet.wallets w
   WHERE w.owner_id=v_buyer FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet missing' USING ERRCODE='P0001';
  END IF;
  SELECT o.* INTO v_order FROM ec_wallet.staging_cart_orders_v2 o
   WHERE o.order_id=p_order_id AND o.buyer_id=v_buyer FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE='P0001';
  END IF;
  IF v_order.status='cancelled' THEN
    -- This replay is safe ONLY after the original cancellation transaction
    -- committed. Verify reversal and allocation void evidence in final RPC.
    RAISE EXCEPTION 'Cancellation replay evidence verification not implemented';
  END IF;
  IF v_order.status<>'created' THEN
    RAISE EXCEPTION 'Order not cancellable' USING ERRCODE='P0001';
  END IF;

  SELECT count(*),coalesce(sum(l.delta_ec::numeric),0)
    INTO v_debit_count,v_debit_amount FROM ec_wallet.ledger l
   WHERE l.wallet_id=v_wallet AND l.operation='cart_checkout_debit_v2'
     AND l.reference_id=p_order_id;
  SELECT count(*),coalesce(sum(l.delta_ec::numeric),0)
    INTO v_reversal_count,v_reversal_amount FROM ec_wallet.ledger l
   WHERE l.wallet_id=v_wallet AND l.operation='cart_checkout_reversal_v2'
     AND l.reference_id=p_order_id;
  IF v_debit_count<>1 OR v_debit_amount<>-v_order.total_ec::numeric
     OR v_reversal_count<>0 OR v_reversal_amount<>0 THEN
    RAISE EXCEPTION 'V2 ledger evidence mismatch' USING ERRCODE='P0001';
  END IF;

  -- Check all reservations BEFORE mutating any state. Consumed or released
  -- lines require separate explicit policy; never refund/restock them here.
  IF EXISTS (
    SELECT 1 FROM ec_wallet.staging_cart_order_lines_v2 l
    LEFT JOIN ec_wallet.staging_inventory_reservations_v2 r
      ON r.line_id=l.line_id
    WHERE l.order_id=p_order_id
      AND (r.reservation_id IS NULL OR r.state<>'reserved'
           OR r.quantity<>l.quantity OR r.product_id<>l.product_id)
  ) THEN
    RAISE EXCEPTION 'Reservation state prevents cancellation' USING ERRCODE='P0001';
  END IF;

  -- The order and wallet locks serialize buyer cancellation, but product
  -- locks must obey the globally reviewed protocol before activation.
  -- Candidate per-product restock and release, deterministic UUID order:
  FOR v_reservation IN
    SELECT r.reservation_id,r.product_id,r.quantity
      FROM ec_wallet.staging_inventory_reservations_v2 r
     WHERE r.order_id=p_order_id ORDER BY r.product_id
  LOOP
    PERFORM 1 FROM ec_wallet.staging_v2_catalogue_products p
      WHERE p.product_id=v_reservation.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product missing for restock' USING ERRCODE='P0001';
    END IF;
  END LOOP;

  -- HARD BLOCK: seller allocation transitions, exact-once event key and
  -- global cross-writer lock audit are not approved.
  RAISE EXCEPTION 'V2 cancellation posting intentionally disabled';

  -- UNREACHABLE transaction write candidate, preserved for review:
  FOR v_reservation IN
    SELECT r.reservation_id,r.product_id,r.quantity
      FROM ec_wallet.staging_inventory_reservations_v2 r
     WHERE r.order_id=p_order_id ORDER BY r.product_id
  LOOP
    UPDATE ec_wallet.staging_inventory_reservations_v2 r
       SET state='released',released_at=pg_catalog.transaction_timestamp(),
           release_reason='order_cancelled'
     WHERE r.reservation_id=v_reservation.reservation_id AND r.state='reserved';
    GET DIAGNOSTICS v_rows=ROW_COUNT;
    IF v_rows<>1 THEN
      RAISE EXCEPTION 'Reservation release mismatch';
    END IF;
    UPDATE ec_wallet.staging_v2_catalogue_products p
       SET stock_available=p.stock_available+v_reservation.quantity,
           revision=p.revision+1,
           updated_at=pg_catalog.transaction_timestamp()
     WHERE p.product_id=v_reservation.product_id;
    GET DIAGNOSTICS v_rows=ROW_COUNT;
    IF v_rows<>1 THEN
      RAISE EXCEPTION 'Stock restoration mismatch';
    END IF;
  END LOOP;

  -- Separate reversal idempotency UUID, same original order reference.
  -- Existing UNIQUE(wallet_id,operation,reference_id) is the second guard.
  v_reversal_key := pg_catalog.gen_random_uuid();
  INSERT INTO ec_wallet.ledger
    (entry_id,wallet_id,delta_ec,operation,reference_id,idempotency_key)
  VALUES (pg_catalog.gen_random_uuid(),v_wallet,v_order.total_ec,
          'cart_checkout_reversal_v2',p_order_id,v_reversal_key);

  -- Missing allocation voiding and order-event reconciliation intentionally
  -- prevent a successful return. Never remove the guard without them.
  RAISE EXCEPTION 'V2 allocation voiding and cancellation event not implemented';
END
$body$;
REVOKE ALL ON FUNCTION public.ec_staging_cart_cancel_v2(uuid)
  FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- Required acceptance tests: two simultaneous cancel requests, repeated
-- cancel replay, checkout/cancel race, consumed reservation rejection,
-- missing debit, existing reversal, missing allocation, stock overflow,
-- malicious buyer, rollback of all writes and no legacy order changes.
