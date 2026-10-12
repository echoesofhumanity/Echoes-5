-- Echoes of Humanity: creator-first merchandise / marketplace foundation.
-- REVIEW ONLY: committed to Echoes-5 main; NOT applied to Supabase.
-- Independent new tables; does not modify Admin V3, existing tables, policies or backups.
-- No public SELECT or anonymous writes. RLS enabled and no grants/policies added.
BEGIN;

CREATE TABLE public.echoes_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text,
  craft text,
  public_region text,
  public_biography text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','suspended')),
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','published','withdrawn')),
  consent_version text,
  consent_recorded_at timestamptz,
  consent_revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT echoes_creator_publication_gate CHECK (
    publication_status <> 'published'
    OR (verification_status = 'verified'
        AND consent_version IS NOT NULL
        AND consent_recorded_at IS NOT NULL
        AND consent_revoked_at IS NULL)
  )
);

CREATE TABLE public.echoes_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.echoes_creators(id) ON DELETE RESTRICT,
  store text NOT NULL CHECK (store IN ('marketplace','merchandise')),
  title text NOT NULL,
  description text,
  product_type text NOT NULL CHECK (product_type IN ('physical','digital')),
  production_type text NOT NULL DEFAULT 'undetermined'
    CHECK (production_type IN ('handmade','creator_original','approved_exception','undetermined')),
  status text NOT NULL DEFAULT 'concept'
    CHECK (status IN ('concept','review','published','unavailable','retired')),
  checkout_enabled boolean NOT NULL DEFAULT false,
  price_minor_units bigint CHECK (price_minor_units IS NULL OR price_minor_units >= 0),
  currency char(3),
  ec_display_amount integer CHECK (ec_display_amount IS NULL OR ec_display_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT echoes_product_checkout_gate CHECK (
    NOT checkout_enabled OR (status = 'published' AND creator_id IS NOT NULL
      AND price_minor_units IS NOT NULL AND currency IS NOT NULL)
  )
);

ALTER TABLE public.echoes_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echoes_products ENABLE ROW LEVEL SECURITY;

-- No public access policies in this migration. Application/API access is a separate reviewed step.
COMMIT;
