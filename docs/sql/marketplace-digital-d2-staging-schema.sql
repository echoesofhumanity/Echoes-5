-- Echoes Marketplace D2: ISOLATED STAGING SCHEMA SPECIFICATION ONLY.
-- DO NOT execute against production Supabase or Oracle.
-- No permissions granted to anon/authenticated; no live checkout.
-- Intended for an isolated staging database after independent review.
BEGIN;
CREATE SCHEMA IF NOT EXISTS echoes_digital_stage;
REVOKE ALL ON SCHEMA echoes_digital_stage FROM PUBLIC;
REVOKE ALL ON SCHEMA echoes_digital_stage FROM anon, authenticated;
CREATE TABLE echoes_digital_stage.creators (
  id uuid PRIMARY KEY,
  private_subject_id uuid NOT NULL UNIQUE,
  verification_state text NOT NULL DEFAULT 'pending'
    CHECK (verification_state IN ('pending','verified','suspended')),
  publication_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE echoes_digital_stage.stores (
  id uuid PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES echoes_digital_stage.creators(id),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','published','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,creator_id)
);
CREATE TABLE echoes_digital_stage.digital_listings (
  id uuid PRIMARY KEY,
  store_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ebook','audio','digital_art')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','reviewed','approved','published','paused','withdrawn','rejected')),
  ec_reference_price bigint NOT NULL CHECK (ec_reference_price > 0),
  license_code text NOT NULL CHECK (char_length(license_code) BETWEEN 1 AND 100),
  territory_policy text NOT NULL CHECK (char_length(territory_policy) BETWEEN 1 AND 200),
  consent_confirmed boolean NOT NULL DEFAULT false,
  rights_reviewed boolean NOT NULL DEFAULT false,
  checkout_enabled boolean NOT NULL DEFAULT false CHECK (checkout_enabled = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (store_id,creator_id) REFERENCES echoes_digital_stage.stores(id,creator_id)
);
CREATE TABLE echoes_digital_stage.listing_localizations (
  listing_id uuid NOT NULL REFERENCES echoes_digital_stage.digital_listings(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en','tr','ru','de','es','fr','pt','zh','ar')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 12000),
  PRIMARY KEY(listing_id,language)
);
CREATE TABLE echoes_digital_stage.digital_assets (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES echoes_digital_stage.digital_listings(id),
  role text NOT NULL CHECK (role IN ('preview','deliverable','cover')),
  private_object_key text NOT NULL UNIQUE CHECK (char_length(private_object_key) BETWEEN 1 AND 500),
  media_type text NOT NULL CHECK (char_length(media_type) BETWEEN 3 AND 120),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  sha256_hex text NOT NULL CHECK (sha256_hex ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE echoes_digital_stage.rights_evidence (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES echoes_digital_stage.digital_listings(id),
  private_evidence_key text NOT NULL UNIQUE,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE echoes_digital_stage.review_events (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES echoes_digital_stage.digital_listings(id),
  actor_subject_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submit','review','approve','reject','publish','pause','withdraw')),
  from_state text NOT NULL,
  to_state text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON echoes_digital_stage.digital_listings(store_id,status);
CREATE INDEX ON echoes_digital_stage.digital_assets(listing_id,role);
CREATE INDEX ON echoes_digital_stage.review_events(listing_id,created_at);
-- Defense in depth: RLS enabled and FORCEd; no role grants or policies.
ALTER TABLE echoes_digital_stage.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.creators FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.stores FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.digital_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.digital_listings FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.listing_localizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.listing_localizations FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.digital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.digital_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.rights_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.rights_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes_digital_stage.review_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA echoes_digital_stage FROM PUBLIC, anon, authenticated;
COMMIT;
