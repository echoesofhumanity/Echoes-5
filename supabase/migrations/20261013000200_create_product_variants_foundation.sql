-- Echoes of Humanity: product variant foundation.
-- REVIEW ONLY: not applied to Supabase.
-- Adds one independent child table; does not change existing tables or Admin V3.
BEGIN;

CREATE TABLE public.echoes_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.echoes_products(id) ON DELETE RESTRICT,
  sku text,
  color_name text,
  size_label text,
  option_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  availability_status text NOT NULL DEFAULT 'unverified'
    CHECK (availability_status IN ('unverified','available','unavailable','discontinued')),
  price_minor_units bigint CHECK (price_minor_units IS NULL OR price_minor_units >= 0),
  currency char(3),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT echoes_variant_price_currency_pair CHECK (
    (price_minor_units IS NULL AND currency IS NULL)
    OR (price_minor_units IS NOT NULL AND currency IS NOT NULL)
  ),
  CONSTRAINT echoes_variant_options_object CHECK (jsonb_typeof(option_details) = 'object')
);

CREATE UNIQUE INDEX echoes_product_variants_sku_unique
  ON public.echoes_product_variants (sku) WHERE sku IS NOT NULL;
CREATE INDEX echoes_product_variants_product_order_idx
  ON public.echoes_product_variants (product_id, display_order);

ALTER TABLE public.echoes_product_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.echoes_product_variants FROM anon, authenticated;

-- No public API policies and no data inserted. Variant visibility/stock require separate review.
COMMIT;
