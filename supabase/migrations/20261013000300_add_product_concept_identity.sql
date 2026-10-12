-- Echoes of Humanity: stable concept identity for merchandise catalog mapping.
-- REVIEW ONLY: not applied to Supabase.
-- Changes only public.echoes_products; does not touch Admin V3 or backups.
BEGIN;

ALTER TABLE public.echoes_products
  ADD COLUMN concept_id text;

ALTER TABLE public.echoes_products
  ADD CONSTRAINT echoes_products_concept_id_format CHECK (
    concept_id IS NULL OR concept_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

CREATE UNIQUE INDEX echoes_products_concept_id_unique
  ON public.echoes_products (concept_id)
  WHERE concept_id IS NOT NULL;

-- Existing products remain unchanged. No records, grants, policies or checkout added.
COMMIT;
