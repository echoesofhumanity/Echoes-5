-- Echoes Marketplace: read-only, publication-gated storefront projection.
-- Review-only migration: no grants or policies for anon/authenticated.
BEGIN;
CREATE VIEW public.echoes_public_marketplace_storefront_catalog
WITH (security_invoker = true)
AS
SELECT
  s.id AS store_id,
  s.slug AS store_slug,
  s.display_name AS store_display_name,
  s.public_description AS store_description,
  s.store_kind,
  p.id AS product_id,
  p.title AS product_title,
  p.description AS product_description,
  p.product_type,
  c.display_name AS creator_display_name,
  c.craft AS creator_craft,
  c.public_region AS creator_public_region
FROM public.echoes_marketplace_stores s
JOIN public.echoes_marketplace_store_products sp ON sp.store_id = s.id
JOIN public.echoes_products p ON p.id = sp.product_id
LEFT JOIN public.echoes_creators c ON c.id = s.creator_id
WHERE s.publication_status = 'published'
  AND p.status = 'published'
  AND (
    (s.store_kind = 'independent'
     AND p.store = 'marketplace'
     AND s.creator_id = p.creator_id
     AND c.verification_status = 'verified'
     AND c.publication_status = 'published'
     AND c.consent_version IS NOT NULL
     AND c.consent_recorded_at IS NOT NULL
     AND c.consent_revoked_at IS NULL)
    OR
    (s.store_kind = 'echoes_official'
     AND s.creator_id IS NULL
     AND p.store = 'merchandise'
     AND p.creator_id IS NULL)
  );
REVOKE ALL PRIVILEGES ON TABLE public.echoes_public_marketplace_storefront_catalog
  FROM PUBLIC, anon, authenticated;
COMMIT;
