-- Echoes Marketplace V2 / server-side cart validation and normalization
-- REVIEW DRAFT ONLY: DO NOT EXECUTE on staging or production.
-- This helper DOES NOT create orders, reserve stock, charge EC or authorize checkout.
-- Future checkout must recompute prices and seller eligibility under locks.
-- The initial unconditional exception prevents accidental installation.
DO $review_only$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: V2 cart normalization migration not approved';
END
$review_only$;

BEGIN;
CREATE FUNCTION ec_wallet.v2_normalize_cart(p_lines jsonb)
RETURNS TABLE(product_id uuid, quantity integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_line jsonb;
  v_id_text text;
  v_qty_text text;
  v_id uuid;
  v_qty integer;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_count integer;
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'Cart must be a JSON array' USING ERRCODE='22023';
  END IF;
  v_count := jsonb_array_length(p_lines);
  IF v_count NOT BETWEEN 1 AND 50 OR pg_catalog.length(p_lines::text) > 16384 THEN
    RAISE EXCEPTION 'Cart size out of bounds' USING ERRCODE='22023';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    IF jsonb_typeof(v_line) <> 'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_line)) <> 2
       OR NOT (v_line ? 'product_id' AND v_line ? 'quantity')
       OR jsonb_typeof(v_line->'product_id') <> 'string'
       OR jsonb_typeof(v_line->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'Invalid cart line shape' USING ERRCODE='22023';
    END IF;
    v_id_text := v_line->>'product_id';
    v_qty_text := v_line->>'quantity';
    IF v_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR v_qty_text !~ '^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Invalid product UUID or integer quantity' USING ERRCODE='22023';
    END IF;
    v_id := v_id_text::uuid;
    v_qty := v_qty_text::integer;
    IF v_qty NOT BETWEEN 1 AND 99 OR v_id = ANY(v_seen) THEN
      RAISE EXCEPTION 'Quantity out of bounds or duplicate product' USING ERRCODE='22023';
    END IF;
    v_seen := pg_catalog.array_append(v_seen,v_id);
    product_id := v_id;
    quantity := v_qty;
    RETURN NEXT;
  END LOOP;
END
$function$;

REVOKE ALL ON FUNCTION ec_wallet.v2_normalize_cart(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;

-- Contract: future SECURITY DEFINER checkout must call this helper through
-- a schema-qualified name; direct client execution is not authorized.
-- Tests needed: empty/non-array, >50 lines, >16 KiB, extra/missing keys,
-- duplicate UUID in different case, malformed UUID, null, boolean, strings,
-- negative/zero/>99, 1.0 and exponent JSON numeric spellings, overflow.
-- IMPORTANT: PostgreSQL jsonb normalizes numeric spellings; numeric 1.0 may
-- stringify as 1.0, but some equivalent JSON representations can normalize.
-- For a strict integer *semantic* contract, review numeric acceptance against
-- actual jsonb behavior in an isolated non-production test harness.
-- No digest generated here: canonicalize validated (UUID,qty) sorted pairs
-- and compute request_digest in the approved checkout RPC.
