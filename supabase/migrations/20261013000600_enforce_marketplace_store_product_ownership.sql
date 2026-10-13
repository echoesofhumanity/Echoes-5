-- Enforce store/product ownership at the database boundary.
-- Existing official merchandise concept links remain valid.
BEGIN;

CREATE OR REPLACE FUNCTION public.echoes_validate_marketplace_store_product_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_kind text;
  v_owner uuid;
  v_product_owner uuid;
  v_product_store text;
BEGIN
  SELECT store_kind, creator_id INTO v_kind, v_owner
  FROM public.echoes_marketplace_stores WHERE id = NEW.store_id FOR SHARE;
  SELECT creator_id, store INTO v_product_owner, v_product_store
  FROM public.echoes_products WHERE id = NEW.product_id FOR SHARE;
  IF NOT FOUND OR v_kind IS NULL THEN
    RAISE EXCEPTION 'Store or product does not exist';
  END IF;
  IF (v_kind = 'independent' AND (v_product_store <> 'marketplace' OR v_product_owner IS DISTINCT FROM v_owner))
     OR (v_kind = 'echoes_official' AND (v_product_store <> 'merchandise' OR v_product_owner IS NOT NULL)) THEN
    RAISE EXCEPTION 'Product ownership is incompatible with storefront';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.echoes_validate_marketplace_store_product_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER echoes_store_product_owner_guard
BEFORE INSERT OR UPDATE OF store_id, product_id
ON public.echoes_marketplace_store_products
FOR EACH ROW EXECUTE FUNCTION public.echoes_validate_marketplace_store_product_owner();

-- Guard changes to ownership/category of already linked records.
CREATE OR REPLACE FUNCTION public.echoes_revalidate_marketplace_product_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.echoes_marketplace_store_products sp
    JOIN public.echoes_marketplace_stores s ON s.id=sp.store_id
    WHERE sp.product_id=NEW.id AND NOT (
      (s.store_kind='independent' AND NEW.store='marketplace' AND NEW.creator_id=s.creator_id)
      OR (s.store_kind='echoes_official' AND NEW.store='merchandise' AND NEW.creator_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'Cannot change ownership of a linked marketplace product';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.echoes_revalidate_marketplace_product_links() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER echoes_linked_product_owner_guard
BEFORE UPDATE OF creator_id, store ON public.echoes_products
FOR EACH ROW EXECUTE FUNCTION public.echoes_revalidate_marketplace_product_links();

CREATE OR REPLACE FUNCTION public.echoes_revalidate_marketplace_store_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.echoes_marketplace_store_products sp
    JOIN public.echoes_products p ON p.id=sp.product_id
    WHERE sp.store_id=NEW.id AND NOT (
      (NEW.store_kind='independent' AND p.store='marketplace' AND p.creator_id=NEW.creator_id)
      OR (NEW.store_kind='echoes_official' AND p.store='merchandise' AND p.creator_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'Cannot change ownership of a store with linked products';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.echoes_revalidate_marketplace_store_links() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER echoes_linked_store_owner_guard
BEFORE UPDATE OF creator_id, store_kind ON public.echoes_marketplace_stores
FOR EACH ROW EXECUTE FUNCTION public.echoes_revalidate_marketplace_store_links();
COMMIT;
