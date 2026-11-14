-- ISOLATED TEST FIXTURE ONLY. Never run against production or staging.
BEGIN;
CREATE SCHEMA producer_v1_test;
CREATE TABLE producer_v1_test.sellers (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended'))
);
CREATE TABLE producer_v1_test.products (
 id uuid PRIMARY KEY, seller_id uuid NOT NULL REFERENCES producer_v1_test.sellers(id),
 owner_id uuid NOT NULL, title text NOT NULL, status text NOT NULL DEFAULT 'draft'
 CHECK(status IN ('draft','submitted','in_review','approved','rejected','withdrawn'))
);
CREATE TABLE producer_v1_test.product_assets (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES producer_v1_test.products(id),
 owner_id uuid NOT NULL, object_key text NOT NULL
);
CREATE ROLE producer_v1_actor NOLOGIN;
REVOKE ALL ON SCHEMA producer_v1_test FROM PUBLIC;
GRANT USAGE ON SCHEMA producer_v1_test TO producer_v1_actor;
GRANT SELECT ON producer_v1_test.sellers TO producer_v1_actor;
GRANT SELECT,INSERT ON producer_v1_test.products,producer_v1_test.product_assets TO producer_v1_actor;
ALTER TABLE producer_v1_test.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_v1_test.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_v1_test.product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_v1_test.sellers FORCE ROW LEVEL SECURITY;
ALTER TABLE producer_v1_test.products FORCE ROW LEVEL SECURITY;
ALTER TABLE producer_v1_test.product_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY seller_self ON producer_v1_test.sellers FOR SELECT TO producer_v1_actor
 USING(owner_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid);
CREATE POLICY own_product ON producer_v1_test.products FOR SELECT TO producer_v1_actor
 USING(owner_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid);
CREATE POLICY approved_seller_product_insert ON producer_v1_test.products FOR INSERT TO producer_v1_actor
 WITH CHECK (
 owner_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 AND status='draft'
 AND EXISTS(SELECT 1 FROM producer_v1_test.sellers s WHERE s.id=seller_id AND s.owner_id=owner_id AND s.status='approved')
 );
CREATE POLICY own_asset ON producer_v1_test.product_assets FOR SELECT TO producer_v1_actor
 USING(owner_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid);
CREATE POLICY approved_seller_asset_insert ON producer_v1_test.product_assets FOR INSERT TO producer_v1_actor
 WITH CHECK (
 owner_id = nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 AND EXISTS(
 SELECT 1 FROM producer_v1_test.products p
 JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 WHERE p.id=product_id AND p.owner_id=owner_id AND p.status='draft'
 AND s.owner_id=owner_id AND s.status='approved'
 )
 );
COMMIT;
