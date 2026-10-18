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

  -- Lock products in UUID order, one at a time. Do not rely on unordered IN locks.
  -- Seller verification is rechecked AFTER each product lock.
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
    IF NOT EXISTS (
      SELECT 1 FROM ec_wallet.staging_sellers s
      WHERE s.seller_id=v_product.seller_id AND s.verification_status='verified'
    ) THEN
      RAISE EXCEPTION 'Seller not verified' USING ERRCODE='P0001';
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
  -- reservation expiry policy, seller lock protocol and concurrency tests exist.
  RAISE EXCEPTION 'V2 checkout posting intentionally disabled pending accounting and seller-lock review';

  -- Intended same-transaction write sequence (NOT IMPLEMENTED):
  -- insert order header + immutable lines + reservations; decrement stock;
  -- insert exactly one V2 ledger debit and reconciled synthetic seller payables;
  -- insert created event; deferred totals validated at commit.
  -- Never swallow errors or return success without those writes.
END
$body$;

REVOKE ALL ON FUNCTION public.ec_staging_cart_checkout_v2(jsonb,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;

-- REVIEW FINDINGS / GATES:
-- 1. The function is deliberately uncallable by normal clients and raises before posting.
-- 2. pgcrypto extension schema ('extensions') must be verified read-only.
-- 3. Seller status must be protected by a consistent locking protocol; the
--    existence check above is NOT sufficient against concurrent suspension.
-- 4. The product lock loop may hold locks for a long cart; test lock timeouts.
-- 5. Future price snapshot must be captured while product locks are held.
-- 6. Add strict checkout posting, reversal and payable reconciliation separately.
-- 7. Existing single-item checkout is untouched; no real payments.
