-- Echoes Marketplace V2 — atomic synthetic checkout implementation candidate
-- 18 October 2026. REVIEW ONLY. NEVER EXECUTE on staging or production.
-- Depends on approved independent catalogue, multi-item schema, consolidated guards,
-- normalization helper, ledger CHECK extension and reviewed synthetic payable journal.
-- FAIL CLOSED before any DDL. No checkout RPC currently deployed by this file.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 atomic checkout is not approved or complete';
END
$review$;

BEGIN;
CREATE FUNCTION public.ec_staging_cart_checkout_v2(
  p_lines jsonb, p_idempotency_key uuid
) RETURNS TABLE(order_id uuid, total_ec bigint, replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE
  v_buyer uuid := auth.uid();
  v_wallet uuid;
  v_order uuid;
  v_existing ec_wallet.staging_cart_orders_v2%ROWTYPE;
  v_digest text;
  v_balance numeric;
  v_total numeric := 0;
  v_count integer;
  v_item record;
  v_product record;
  v_subtotal numeric;
  v_lines jsonb;
  v_seller_id uuid;
  v_seller_status text;
  v_seller_ids uuid[] := ARRAY[]::uuid[];
  v_candidate_seller_id uuid;
  v_line_id uuid;
  v_stock_rows integer;
  v_debit_entry_id uuid;
  v_allocation record;
  v_seller_ec bigint;
  v_humanitarian_ec bigint;
  v_operating_ec bigint;
  -- Intentionally unset: versioned policy approval required.
  v_policy_seller_bps integer := NULL;
  v_policy_humanitarian_bps integer := NULL;
  v_policy_operating_bps integer := NULL;
BEGIN
  IF v_buyer IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Authenticated buyer and request key required' USING ERRCODE='28000';
  END IF;

  -- Normalize first; sorted pairs define a stable server-owned request digest.
  SELECT count(*), pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_array(x.product_id::text,x.quantity)
      ORDER BY x.product_id)
    INTO v_count,v_lines
  FROM ec_wallet.v2_normalize_cart(p_lines) x;
  IF v_count NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid cart' USING ERRCODE='22023';
  END IF;
  -- pgcrypto digest availability and extension schema must be verified in staging.
  v_digest := pg_catalog.encode(extensions.digest(v_lines::text,'sha256'),'hex');

  SELECT w.wallet_id INTO v_wallet FROM ec_wallet.wallets w
  WHERE w.owner_id=v_buyer FOR UPDATE;
  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found' USING ERRCODE='P0001';
  END IF;

  SELECT o.* INTO v_existing FROM ec_wallet.staging_cart_orders_v2 o
  WHERE o.buyer_id=v_buyer AND o.idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_digest <> v_digest THEN
      RAISE EXCEPTION 'Idempotency key reused for another cart' USING ERRCODE='23505';
    END IF;
    -- Replaying an order must not hide a missing debit, event or broken
    -- immutable line total. A cancelled order also needs its reversal.
    IF v_existing.status NOT IN ('created','cancelled')
       OR NOT EXISTS (
         SELECT 1 FROM ec_wallet.staging_cart_order_lines_v2 l
         WHERE l.order_id=v_existing.order_id
       )
       OR (SELECT coalesce(sum(l.subtotal_ec::numeric),0)
           FROM ec_wallet.staging_cart_order_lines_v2 l
           WHERE l.order_id=v_existing.order_id)<>v_existing.total_ec::numeric
       OR (SELECT count(*) FROM ec_wallet.ledger l
           WHERE l.wallet_id=v_wallet
             AND l.operation='cart_checkout_debit_v2'
             AND l.reference_id=v_existing.order_id
             AND l.delta_ec=-v_existing.total_ec)<>1
       OR (SELECT count(*) FROM ec_wallet.staging_cart_order_events_v2 e
           WHERE e.order_id=v_existing.order_id AND e.event_type='created')<>1
       OR (v_existing.status='cancelled' AND (
           (SELECT count(*) FROM ec_wallet.ledger l
            WHERE l.wallet_id=v_wallet
              AND l.operation='cart_checkout_reversal_v2'
              AND l.reference_id=v_existing.order_id
              AND l.delta_ec=v_existing.total_ec)<>1
           OR (SELECT count(*) FROM ec_wallet.staging_cart_order_events_v2 e
               WHERE e.order_id=v_existing.order_id AND e.event_type='cancelled')<>1
       ))
    THEN
      RAISE EXCEPTION 'Checkout replay evidence incomplete; manual review';
    END IF;
    order_id := v_existing.order_id;
    total_ec := v_existing.total_ec;
    replayed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Ledger idempotency key is wallet-global, including legacy operations.
  IF EXISTS (SELECT 1 FROM ec_wallet.ledger l
             WHERE l.wallet_id=v_wallet AND l.idempotency_key=p_idempotency_key) THEN
    RAISE EXCEPTION 'Wallet idempotency key already used' USING ERRCODE='23505';
  END IF;

  -- Discover seller IDs WITHOUT treating the read as eligibility evidence.
  -- All seller locks are acquired before any product lock.
  FOR v_candidate_seller_id IN
    SELECT DISTINCT p.seller_id
    FROM ec_wallet.staging_v2_catalogue_products p
    JOIN ec_wallet.v2_normalize_cart(p_lines) x ON x.product_id=p.product_id
    ORDER BY p.seller_id
  LOOP
    SELECT s.verification_status INTO v_seller_status
    FROM ec_wallet.staging_sellers s
    WHERE s.seller_id=v_candidate_seller_id FOR SHARE;
    IF NOT FOUND OR v_seller_status <> 'verified' THEN
      RAISE EXCEPTION 'Seller not verified' USING ERRCODE='P0001';
    END IF;
    v_seller_ids := pg_catalog.array_append(v_seller_ids,v_candidate_seller_id);
  END LOOP;

  -- Now lock every product in ascending UUID order. A concurrent seller
  -- reassignment invalidates the preliminary seller set: abort, never lock
  -- a new seller out of order. The caller may retry with a new transaction.
  FOR v_item IN SELECT x.product_id,x.quantity
    FROM ec_wallet.v2_normalize_cart(p_lines) x ORDER BY x.product_id
  LOOP
    SELECT p.product_id,p.seller_id,p.price_ec,p.stock_available,
           p.active,p.publication_status,p.test_only,p.environment,
           p.rights_review_status,p.policy_review_status,p.fulfilment_mode
      INTO v_product
      FROM ec_wallet.staging_v2_catalogue_products p
      WHERE p.product_id=v_item.product_id FOR UPDATE;
    IF NOT FOUND OR NOT v_product.active
       OR v_product.publication_status <> 'published'
       OR v_product.test_only IS DISTINCT FROM true
       OR v_product.environment <> 'staging'
       OR v_product.rights_review_status <> 'approved'
       OR v_product.policy_review_status <> 'approved'
       OR v_product.stock_available < v_item.quantity THEN
      RAISE EXCEPTION 'Product unavailable' USING ERRCODE='P0001';
    END IF;
    IF NOT (v_product.seller_id = ANY(v_seller_ids)) THEN
      RAISE EXCEPTION 'Seller changed during checkout; retry' USING ERRCODE='40001';
    END IF;
    v_subtotal := v_product.price_ec::numeric * v_item.quantity;
    v_total := v_total + v_subtotal;
    IF v_total > 9007199254740991 THEN
      RAISE EXCEPTION 'EC amount exceeds safe range' USING ERRCODE='22003';
    END IF;
  END LOOP;

  SELECT coalesce(sum(l.delta_ec::numeric),0) INTO v_balance
  FROM ec_wallet.ledger l WHERE l.wallet_id=v_wallet;
  IF v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient EC balance' USING ERRCODE='P0001';
  END IF;

  -- HARD IMPLEMENTATION BLOCKER: do not allow even an approved migration
  -- to authorize checkout until atomic seller allocation, debit namespace,
  -- reservation expiry policy, cross-writer lock audit and concurrency tests exist.
  RAISE EXCEPTION 'V2 checkout posting intentionally disabled pending accounting and seller-lock review';

  -- UNREACHABLE IMPLEMENTATION CANDIDATE: intentionally AFTER the hard
  -- exception. This code is for static review, not an operational checkout.
  -- The full transaction must not be enabled until EC debit, multi-seller
  -- synthetic allocations and rollback/privilege reviews are completed.
  v_order := pg_catalog.gen_random_uuid();
  INSERT INTO ec_wallet.staging_cart_orders_v2
    (order_id,buyer_id,idempotency_key,request_digest,currency_code,total_ec)
  VALUES (v_order,v_buyer,p_idempotency_key,v_digest,'EC',v_total::bigint);

  -- Re-read only rows already locked by this transaction, in the same order.
  FOR v_item IN SELECT x.product_id,x.quantity
    FROM ec_wallet.v2_normalize_cart(p_lines) x ORDER BY x.product_id
  LOOP
    SELECT p.product_id,p.seller_id,p.price_ec,p.stock_available
      INTO v_product
      FROM ec_wallet.staging_v2_catalogue_products p
      WHERE p.product_id=v_item.product_id;
    IF NOT FOUND OR v_product.stock_available < v_item.quantity THEN
      RAISE EXCEPTION 'Product became unavailable' USING ERRCODE='P0001';
    END IF;
    v_subtotal := v_product.price_ec::numeric * v_item.quantity;
    v_line_id := pg_catalog.gen_random_uuid();
    INSERT INTO ec_wallet.staging_cart_order_lines_v2
      (line_id,order_id,product_id,seller_id,quantity,unit_price_ec,subtotal_ec)
    VALUES (v_line_id,v_order,v_product.product_id,v_product.seller_id,
            v_item.quantity,v_product.price_ec,v_subtotal::bigint);
    INSERT INTO ec_wallet.staging_inventory_reservations_v2
      (line_id,order_id,product_id,quantity,state,expires_at)
    VALUES (v_line_id,v_order,v_product.product_id,v_item.quantity,
            'reserved',pg_catalog.transaction_timestamp() + interval '30 minutes');
    UPDATE ec_wallet.staging_v2_catalogue_products p
       SET stock_available=p.stock_available-v_item.quantity,
           revision=p.revision+1,
           updated_at=pg_catalog.transaction_timestamp()
     WHERE p.product_id=v_item.product_id
       AND p.stock_available >= v_item.quantity;
    GET DIAGNOSTICS v_stock_rows = ROW_COUNT;
    IF v_stock_rows <> 1 THEN
      RAISE EXCEPTION 'Stock update count mismatch' USING ERRCODE='P0001';
    END IF;
  END LOOP;

  -- FINANCIAL WRITE CANDIDATE: still unreachable due to the hard stop above.
  -- Ledger CHECK currently excludes 'cart_checkout_debit_v2'; an explicitly
  -- reviewed migration must add this operation BEFORE any activation.
  -- Wallet lock was acquired before balance check; use one debit per order.
  v_debit_entry_id := pg_catalog.gen_random_uuid();
  INSERT INTO ec_wallet.ledger
    (entry_id,wallet_id,delta_ec,operation,reference_id,idempotency_key)
  VALUES
    (v_debit_entry_id,v_wallet,-v_total::bigint,'cart_checkout_debit_v2',
     v_order,p_idempotency_key);

  -- Candidate per-seller synthetic allocation posting. The three policy
  -- variables remain NULL until an approved, versioned policy is supplied.
  -- Basis points (10,000 = 100%) avoid floating-point EC calculations.
  IF v_policy_seller_bps IS NULL OR v_policy_humanitarian_bps IS NULL
     OR v_policy_operating_bps IS NULL
     OR v_policy_seller_bps<0 OR v_policy_humanitarian_bps<0
     OR v_policy_operating_bps<0
     OR v_policy_seller_bps+v_policy_humanitarian_bps+
        v_policy_operating_bps<>10000
     OR v_policy_operating_bps>300 THEN
    RAISE EXCEPTION 'Approved V2 allocation policy is required';
  END IF;

  FOR v_allocation IN
    SELECT l.seller_id,sum(l.subtotal_ec::numeric)::bigint AS gross_ec
      FROM ec_wallet.staging_cart_order_lines_v2 l
     WHERE l.order_id=v_order
     GROUP BY l.seller_id ORDER BY l.seller_id
  LOOP
    -- Operating share is rounded DOWN first so it can never exceed
    -- its policy rate or the absolute 3% ceiling for small EC totals.
    -- Humanitarian share is rounded DOWN next. The seller receives the
    -- residual EC units; no fractional credits are created.
    v_operating_ec := pg_catalog.floor(
      v_allocation.gross_ec::numeric*v_policy_operating_bps/10000)::bigint;
    v_humanitarian_ec := pg_catalog.floor(
      v_allocation.gross_ec::numeric*v_policy_humanitarian_bps/10000)::bigint;
    v_seller_ec := v_allocation.gross_ec-v_operating_ec-v_humanitarian_ec;
    IF v_seller_ec<0 OR v_operating_ec::numeric*10000 >
       v_allocation.gross_ec::numeric*300 THEN
      RAISE EXCEPTION 'Allocation violates operating cap or balance';
    END IF;
    INSERT INTO ec_wallet.staging_cart_seller_allocations_v2
      (order_id,seller_id,gross_ec,seller_ec,humanitarian_ec,operating_ec)
    VALUES (v_order,v_allocation.seller_id,v_allocation.gross_ec,
            v_seller_ec,v_humanitarian_ec,v_operating_ec);
  END LOOP;
  -- Synthetic payable projection only, not a balanced settlement journal.

  -- The following event is intentionally unreachable as well.
  INSERT INTO ec_wallet.staging_cart_order_events_v2
    (order_id,actor_id,event_type,event_reference)
  VALUES (v_order,v_buyer,'created',p_idempotency_key);

  -- SECOND fail-closed stop: prevents returning a false purchase result
  -- if the earlier guard is accidentally removed during editing.
  RAISE EXCEPTION 'V2 seller allocation policy and balanced accounting not implemented';
  -- No success RETURN is allowed until accounting is fully implemented.
END
$body$;

REVOKE ALL ON FUNCTION public.ec_staging_cart_checkout_v2(jsonb,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;

-- REVIEW FINDINGS / GATES:
-- 1. The function is deliberately uncallable by normal clients and raises before posting.
-- 2. pgcrypto extension schema ('extensions') must be verified read-only.
-- 3. Seller locks now precede product locks; still audit admin and legacy
--    writers for inverse lock order before enabling any posting.
-- 4. The product lock loop may hold locks for a long cart; test lock timeouts.
-- 5. Future price snapshot must be captured while product locks are held.
-- 6. Debit INSERT is drafted but unreachable and current ledger CHECK rejects
--    its V2 operation; seller allocation, cancellation and journal remain blocked.
-- 7. Existing single-item checkout is untouched; no real payments.
