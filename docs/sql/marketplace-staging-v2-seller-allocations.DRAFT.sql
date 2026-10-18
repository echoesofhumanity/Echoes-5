-- Echoes Marketplace V2 synthetic multi-seller allocations
-- REVIEW ONLY. DO NOT EXECUTE. Requires explicit approval.
-- No fiat payout, money movement, or production settlement.
-- Ledger debit and allocations MUST commit together in checkout transaction.
DO $review$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: synthetic seller allocation migration not approved';
END
$review$;

BEGIN;
CREATE TABLE ec_wallet.staging_cart_seller_allocations_v2 (
  allocation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ec_wallet.staging_cart_orders_v2(order_id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES ec_wallet.staging_sellers(seller_id) ON DELETE RESTRICT,
  currency_code text NOT NULL DEFAULT 'EC' CHECK (currency_code = 'EC'),
  gross_ec bigint NOT NULL CHECK (gross_ec > 0 AND gross_ec <= 9007199254740991),
  seller_ec bigint NOT NULL CHECK (seller_ec >= 0),
  humanitarian_ec bigint NOT NULL CHECK (humanitarian_ec >= 0),
  operating_ec bigint NOT NULL CHECK (operating_ec >= 0),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','voided')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  voided_at timestamptz,
  CONSTRAINT staging_v2_allocation_unique UNIQUE (order_id,seller_id),
  CONSTRAINT staging_v2_allocation_balance CHECK
    (seller_ec + humanitarian_ec + operating_ec = gross_ec),
  CONSTRAINT staging_v2_allocation_void_consistency CHECK (
    (state='pending' AND voided_at IS NULL) OR
    (state='voided' AND voided_at IS NOT NULL)
  )
);
CREATE INDEX staging_v2_allocation_seller_idx
  ON ec_wallet.staging_cart_seller_allocations_v2(seller_id,created_at DESC);
ALTER TABLE ec_wallet.staging_cart_seller_allocations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ec_wallet.staging_cart_seller_allocations_v2
  FROM PUBLIC,anon,authenticated;

-- This DDL does NOT define percentages. Allocation policy must be explicit,
-- versioned, approved and computed using integer EC with deterministic rounding.
-- No arbitrary split may be invented. For each order require:
-- SUM(allocation.gross_ec) = order.total_ec;
-- For each seller require gross_ec = SUM(line.subtotal_ec).
-- Row CHECK does not enforce cross-row totals: add deferred reconciliation guard.
-- No allocation may be inserted without the matching wallet debit.
-- Refund/cancellation must void each allocation atomically with reversal.
-- Enforce immutability of amounts/identities and guarded pending->voided transition.
-- This table is a synthetic payable projection, NOT double-entry accounting.
-- A separate balanced liability journal remains required before production.
COMMIT;
