-- Echoes of Humanity — public merchandise catalog projection.
-- REVIEW ONLY. NOT APPLIED. No public access is granted by this draft.
-- This security-invoker view respects the underlying tables' RLS.
-- A future release must separately review narrow read policies/grants and verify
-- that private creator records remain inaccessible to anon/authenticated.
BEGIN;

CREATE VIEW public.echoes_public_merchandise_catalog
WITH (security_invoker = true)
AS
SELECT
  p.id AS product_id,
  p.concept_id,
  p.title,
  p.description,
  p.product_type,
  p.ec_display_amount,
  c.display_name AS creator_display_name,
  c.craft AS creator_craft,
  c.public_region AS creator_public_region,
  c.public_biography AS creator_public_biography
FROM public.echoes_products AS p
JOIN public.echoes_creators AS c ON c.id = p.creator_id
WHERE p.store = 'merchandise'
  AND p.status = 'published'
  AND c.verification_status = 'verified'
  AND c.publication_status = 'published'
  AND c.consent_version IS NOT NULL
  AND c.consent_recorded_at IS NOT NULL
  AND c.consent_revoked_at IS NULL;

REVOKE ALL PRIVILEGES ON TABLE public.echoes_public_merchandise_catalog
  FROM PUBLIC, anon, authenticated;

-- No API grants, no source-table RLS policies, no creator/stock changes.
COMMIT;
