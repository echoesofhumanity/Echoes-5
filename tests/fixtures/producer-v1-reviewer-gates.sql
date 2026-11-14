-- Disposable acceptance fixture: execute after producer-v1-approval-gates.sql.
-- No cloud migrations, public API, or live publication.
BEGIN;
CREATE TABLE producer_v1_test.reviewers (user_id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true);
CREATE TABLE producer_v1_test.seller_decisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 seller_id uuid NOT NULL REFERENCES producer_v1_test.sellers(id),
 reviewer_id uuid NOT NULL, decision text NOT NULL CHECK(decision IN ('approved','rejected','suspended')),
 reason text NOT NULL CHECK(length(trim(reason))>0), decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE producer_v1_test.product_decisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id uuid NOT NULL REFERENCES producer_v1_test.products(id),
 reviewer_id uuid NOT NULL, decision text NOT NULL CHECK(decision IN ('approved','rejected')),
 reason text NOT NULL CHECK(length(trim(reason))>0), decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE ROLE producer_v1_reviewer NOLOGIN;
GRANT USAGE ON SCHEMA producer_v1_test TO producer_v1_reviewer;
-- Neither actor nor reviewer receives direct UPDATE/INSERT on decisions or approvals.
REVOKE ALL ON producer_v1_test.reviewers,producer_v1_test.seller_decisions,producer_v1_test.product_decisions FROM PUBLIC,producer_v1_actor,producer_v1_reviewer;
CREATE FUNCTION producer_v1_test.decide_seller(p_seller uuid,p_decision text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM producer_v1_test.reviewers WHERE user_id=actor AND active)
 THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF p_decision NOT IN ('approved','rejected','suspended') OR length(trim(coalesce(p_reason,'')))=0
 THEN RAISE EXCEPTION 'invalid decision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM producer_v1_test.sellers WHERE id=p_seller AND owner_id<>actor FOR UPDATE)
 THEN RAISE EXCEPTION 'seller missing or self-review prohibited'; END IF;
 UPDATE producer_v1_test.sellers SET status=p_decision WHERE id=p_seller;
 INSERT INTO producer_v1_test.seller_decisions(seller_id,reviewer_id,decision,reason)
 VALUES(p_seller,actor,p_decision,p_reason);
END $$;
CREATE FUNCTION producer_v1_test.decide_product(p_product uuid,p_decision text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM producer_v1_test.reviewers WHERE user_id=actor AND active)
 THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF p_decision NOT IN ('approved','rejected') OR length(trim(coalesce(p_reason,'')))=0
 THEN RAISE EXCEPTION 'invalid decision'; END IF;
 IF NOT EXISTS (
 SELECT 1 FROM producer_v1_test.products p JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 WHERE p.id=p_product AND p.owner_id<>actor AND p.status='submitted' AND s.status='approved'
 FOR UPDATE OF p,s
 ) THEN RAISE EXCEPTION 'product not submitted, seller unapproved or self-review prohibited'; END IF;
 UPDATE producer_v1_test.products SET status=p_decision WHERE id=p_product;
 INSERT INTO producer_v1_test.product_decisions(product_id,reviewer_id,decision,reason)
 VALUES(p_product,actor,p_decision,p_reason);
END $$;
REVOKE ALL ON FUNCTION producer_v1_test.decide_seller(uuid,text,text),producer_v1_test.decide_product(uuid,text,text) FROM PUBLIC,producer_v1_actor;
GRANT EXECUTE ON FUNCTION producer_v1_test.decide_seller(uuid,text,text),producer_v1_test.decide_product(uuid,text,text) TO producer_v1_reviewer;
COMMIT;
