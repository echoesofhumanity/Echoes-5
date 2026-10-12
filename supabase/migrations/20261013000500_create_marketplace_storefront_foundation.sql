-- Echoes Marketplace: independent multi-item storefront foundation.
-- REVIEW ONLY: do not apply until reviewed; no existing tables are modified.
-- Closed by default: no API grants, no RLS policies, no seed identities.
BEGIN;

CREATE TABLE public.echoes_marketplace_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.echoes_creators(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  public_description text,
  store_kind text NOT NULL DEFAULT 'independent'
    CHECK (store_kind IN ('independent','echoes_official')),
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','review','published','suspended','withdrawn')),
  public_contact_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT echoes_store_owner_gate CHECK (
    (store_kind = 'independent' AND creator_id IS NOT NULL)
    OR (store_kind = 'echoes_official' AND creator_id IS NULL)
  )
);

CREATE TABLE public.echoes_marketplace_store_products (
  store_id uuid NOT NULL REFERENCES public.echoes_marketplace_stores(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL UNIQUE REFERENCES public.echoes_products(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id)
);

CREATE INDEX echoes_marketplace_stores_creator_idx
  ON public.echoes_marketplace_stores(creator_id);
CREATE INDEX echoes_marketplace_store_products_store_idx
  ON public.echoes_marketplace_store_products(store_id);

ALTER TABLE public.echoes_marketplace_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echoes_marketplace_store_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE
  public.echoes_marketplace_stores,
  public.echoes_marketplace_store_products
  FROM PUBLIC, anon, authenticated;

-- Store publication/consent and product ownership must be enforced in
-- a future reviewed workflow before any public catalog read is granted.
-- No INSERTs, grants, policies or changes to Admin V3.
COMMIT;
