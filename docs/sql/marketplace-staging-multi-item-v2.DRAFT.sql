-- Echoes of Humanity / Marketplace multi-item staging v2
-- REVIEW DRAFT ONLY. DO NOT APPLY TO STAGING OR PRODUCTION.
-- Additive objects; no modifications to existing EC tables or RPCs.
-- This schema deliberately has NO checkout, cancellation or payment RPC.
-- Requires review of auth, grants, dependencies and accounting invariants.
BEGIN;

CREATE TABLE ec_wallet.staging_cart_orders_v2 (
  order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  currency_code text NOT NULL DEFAULT 'EC' CHECK (currency_code = 'EC'),
  total_ec bigint NOT NULL CHECK (total_ec > 0),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','cancelled')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  cancelled_at timestamptz,
  CONSTRAINT cart_orders_v2_buyer_request_unique UNIQUE (buyer_id,idempotency_key),
  CONSTRAINT cart_orders_v2_cancel_consistency CHECK (
    (status = 'created' AND cancelled_at IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
  )
);

CREATE TABLE ec_wallet.staging_cart_order_lines_v2 (
  line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ec_wallet.staging_cart_orders_v2(order_id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES ec_wallet.staging_products(product_id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES ec_wallet.staging_sellers(seller_id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price_ec bigint NOT NULL CHECK (unit_price_ec > 0),
  subtotal_ec bigint NOT NULL CHECK (subtotal_ec > 0),
  CONSTRAINT cart_order_lines_v2_product_unique UNIQUE (order_id,product_id),
  CONSTRAINT cart_order_lines_v2_arithmetic CHECK (
    unit_price_ec <= 9223372036854775807::bigint / quantity
    AND subtotal_ec = unit_price_ec * quantity
  ),
  CONSTRAINT cart_order_lines_v2_line_order_unique UNIQUE (line_id,order_id,product_id)
);

CREATE TABLE ec_wallet.staging_cart_order_events_v2 (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ec_wallet.staging_cart_orders_v2(order_id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('created','cancelled')),
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  event_reference uuid NOT NULL,
  CONSTRAINT cart_order_events_v2_event_reference_unique UNIQUE (order_id,event_reference)
);

CREATE TABLE ec_wallet.staging_inventory_reservations_v2 (
  reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  state text NOT NULL DEFAULT 'reserved'
    CHECK (state IN ('reserved','released','consumed')),
  reserved_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  CONSTRAINT cart_reservations_v2_line_fk FOREIGN KEY (line_id,order_id,product_id)
    REFERENCES ec_wallet.staging_cart_order_lines_v2(line_id,order_id,product_id)
    ON DELETE RESTRICT,
  CONSTRAINT cart_reservations_v2_expiry CHECK (expires_at > reserved_at),
  CONSTRAINT cart_reservations_v2_release_consistency CHECK (
    (state = 'released' AND released_at IS NOT NULL) OR
    (state <> 'released' AND released_at IS NULL)
  )
);

CREATE INDEX cart_orders_v2_buyer_created_idx
  ON ec_wallet.staging_cart_orders_v2 (buyer_id,created_at DESC);
CREATE INDEX cart_lines_v2_order_idx
  ON ec_wallet.staging_cart_order_lines_v2 (order_id);
CREATE INDEX cart_events_v2_order_time_idx
  ON ec_wallet.staging_cart_order_events_v2 (order_id,occurred_at);
CREATE INDEX cart_reservations_v2_expiry_idx
  ON ec_wallet.staging_inventory_reservations_v2 (expires_at)
  WHERE state = 'reserved';

ALTER TABLE ec_wallet.staging_cart_orders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_cart_order_lines_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_cart_order_events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_wallet.staging_inventory_reservations_v2 ENABLE ROW LEVEL SECURITY;

-- Defense in depth. No client-facing table access and no RLS policies.
REVOKE ALL ON ec_wallet.staging_cart_orders_v2 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ec_wallet.staging_cart_order_lines_v2 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ec_wallet.staging_cart_order_events_v2 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ec_wallet.staging_inventory_reservations_v2 FROM PUBLIC,anon,authenticated;

COMMIT;

-- Not yet implemented:
-- * server-owned atomic checkout/cancellation and deterministic locking
-- * append-only event triggers and immutable price snapshots
-- * order total = sum(lines), seller ownership and stock invariants
-- * balanced double-entry EC liability journal and reconciliation
-- * role-isolation tests, concurrent requests, rollback and rollback plan
-- * security review, explicit approval, staging migration execution
-- Until these are complete, the v2 tables must remain inaccessible to clients.
