-- Echoes Marketplace V2 independent staging catalogue
-- REVIEW DRAFT ONLY: DO NOT EXECUTE on staging or production.
-- Additive, isolated tables. Existing staging_products, staging_sellers and
-- single-item checkout RPC remain unchanged.
-- Requires schema, grants, accounting, RPC and security review before approval.
BEGIN;

CREATE TABLE ec_wallet.staging_v2_catalogue_products (
  product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES ec_wallet.staging_sellers(seller_id) ON DELETE RESTRICT,
  environment text NOT NULL DEFAULT 'staging' CHECK (environment = 'staging'),
  test_only boolean NOT NULL DEFAULT true CHECK (test_only IS TRUE),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','reviewed','published','paused','archived')),
  active boolean NOT NULL DEFAULT false,
  price_ec bigint NOT NULL CHECK (price_ec > 0 AND price_ec <= 9007199254740991),
  stock_available integer NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  currency_code text NOT NULL DEFAULT 'EC' CHECK (currency_code = 'EC'),
  product_type text NOT NULL CHECK (product_type IN ('physical','digital','service')),
  fulfilment_mode text NOT NULL CHECK (fulfilment_mode IN ('none','synthetic_delivery')),
  rights_review_status text NOT NULL DEFAULT 'pending'
    CHECK (rights_review_status IN ('pending','approved','rejected')),
  policy_review_status text NOT NULL DEFAULT 'pending'
    CHECK (policy_review_status IN ('pending','approved','rejected')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT v2_catalogue_published_gate CHECK (
    publication_status <> 'published'
    OR (active AND rights_review_status = 'approved' AND policy_review_status = 'approved')
  )
);
CREATE INDEX staging_v2_catalogue_seller_idx
  ON ec_wallet.staging_v2_catalogue_products(seller_id);
ALTER TABLE ec_wallet.staging_v2_catalogue_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ec_wallet.staging_v2_catalogue_products FROM PUBLIC, anon, authenticated;

-- No public read policy, client write permission, or purchase RPC is created.
-- A future reviewed server-only projection must join staging_sellers and
-- enforce verified/not-suspended seller, buyer auth, and product eligibility.
-- Seller suspension model and existing status values need live inspection.
-- IMPORTANT: base multi-item draft currently references staging_products;
-- change its FK to this independent catalogue before ANY V2 migration.
-- Reserve/release stock atomically, with deterministic locks and immutable
-- price snapshots; do not treat this schema as purchase authorization.
-- No triggers for updated_at/revision or automatic publication are added yet.
-- No production identity mapping, real payment, shipment or payout.
COMMIT;
