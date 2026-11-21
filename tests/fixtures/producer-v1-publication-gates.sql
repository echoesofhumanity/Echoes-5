-- Disposable extension: immutable approved revision and public eligibility.
BEGIN;
ALTER TABLE producer_v1_test.products ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE producer_v1_test.product_decisions ADD COLUMN revision integer NOT NULL DEFAULT 1;
-- Revision-aware reviewer decisions: bind each approval to the locked current product revision.
CREATE OR REPLACE FUNCTION producer_v1_test.decide_product(p_product uuid,p_decision text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $revision_review$
DECLARE actor uuid := nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
DECLARE current_revision integer;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM producer_v1_test.reviewers WHERE user_id=actor AND active)
 THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF p_decision NOT IN ('approved','rejected') OR length(trim(coalesce(p_reason,'')))=0
 THEN RAISE EXCEPTION 'invalid decision'; END IF;
 SELECT p.revision INTO current_revision FROM producer_v1_test.products p
 JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 WHERE p.id=p_product AND p.owner_id<>actor AND p.status='submitted' AND s.status='approved'
 FOR UPDATE OF p,s;
 IF current_revision IS NULL THEN RAISE EXCEPTION 'product not submitted, seller unapproved or self-review prohibited'; END IF;
 UPDATE producer_v1_test.products SET status=p_decision WHERE id=p_product;
 INSERT INTO producer_v1_test.product_decisions(product_id,reviewer_id,decision,reason,revision)
 VALUES(p_product,actor,p_decision,p_reason,current_revision);
END $revision_review$;
-- A product content edit creates a new review revision and removes approved status.
-- Direct revision changes are prohibited; old decisions remain audit history only.
CREATE FUNCTION producer_v1_test.enforce_product_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.title IS DISTINCT FROM OLD.title THEN
  IF NEW.revision IS DISTINCT FROM OLD.revision THEN
   RAISE EXCEPTION 'revision cannot be set by caller';
  END IF;
  NEW.revision := OLD.revision+1;
  NEW.status := 'submitted';
 ELSIF NEW.revision IS DISTINCT FROM OLD.revision THEN
  RAISE EXCEPTION 'revision cannot be changed without content edit';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_product_revision BEFORE UPDATE ON producer_v1_test.products
FOR EACH ROW EXECUTE FUNCTION producer_v1_test.enforce_product_revision();
CREATE TABLE producer_v1_test.curators (user_id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true);
REVOKE ALL ON producer_v1_test.curators FROM PUBLIC,producer_v1_actor,producer_v1_reviewer;
CREATE ROLE producer_v1_curator NOLOGIN;
GRANT USAGE ON SCHEMA producer_v1_test TO producer_v1_curator;
CREATE TABLE producer_v1_test.publication_targets (
 product_id uuid NOT NULL REFERENCES producer_v1_test.products(id),
 approved_revision integer NOT NULL,
 target text NOT NULL CHECK(target IN ('marketplace','merchandise')),
 curator_approved boolean NOT NULL DEFAULT false,
 PRIMARY KEY(product_id,target)
);
REVOKE ALL ON producer_v1_test.publication_targets FROM PUBLIC,producer_v1_actor,producer_v1_reviewer;
CREATE FUNCTION producer_v1_test.publish_eligible(p_product uuid,p_target text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
 SELECT 1 FROM producer_v1_test.products p
 JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 JOIN producer_v1_test.publication_targets t ON t.product_id=p.id
 WHERE p.id=p_product AND p.status='approved' AND s.status='approved'
 AND p.revision=t.approved_revision AND t.target=p_target
 AND (t.target='marketplace' OR t.curator_approved)
 AND EXISTS(SELECT 1 FROM producer_v1_test.product_decisions d
 WHERE d.product_id=p.id AND d.revision=p.revision AND d.decision='approved')
 );
$$;
REVOKE ALL ON FUNCTION producer_v1_test.publish_eligible(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION producer_v1_test.publish_eligible(uuid,text) TO producer_v1_actor,producer_v1_reviewer;
CREATE FUNCTION producer_v1_test.approve_publication(p_product uuid,p_target text,p_curator_approved boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
DECLARE rev integer;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM producer_v1_test.reviewers WHERE user_id=actor AND active)
 THEN RAISE EXCEPTION 'reviewer required'; END IF;
 IF p_target NOT IN ('marketplace','merchandise') THEN RAISE EXCEPTION 'invalid target'; END IF;
 SELECT p.revision INTO rev FROM producer_v1_test.products p
 JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 WHERE p.id=p_product AND p.owner_id<>actor AND p.status='approved' AND s.status='approved'
 AND EXISTS(SELECT 1 FROM producer_v1_test.product_decisions d
 WHERE d.product_id=p.id AND d.revision=p.revision AND d.decision='approved')
 FOR UPDATE OF p,s;
 IF rev IS NULL THEN RAISE EXCEPTION 'not eligible'; END IF;
 IF p_target='merchandise' THEN RAISE EXCEPTION 'independent curator approval required'; END IF;
 INSERT INTO producer_v1_test.publication_targets(product_id,approved_revision,target,curator_approved)
 VALUES(p_product,rev,p_target,p_curator_approved)
 ON CONFLICT(product_id,target) DO UPDATE SET approved_revision=excluded.approved_revision,curator_approved=excluded.curator_approved;
END $$;
REVOKE ALL ON FUNCTION producer_v1_test.approve_publication(uuid,text,boolean) FROM PUBLIC,producer_v1_actor;
GRANT EXECUTE ON FUNCTION producer_v1_test.approve_publication(uuid,text,boolean) TO producer_v1_reviewer;
CREATE FUNCTION producer_v1_test.curator_approve_merchandise(p_product uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
DECLARE rev integer;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM producer_v1_test.curators WHERE user_id=actor AND active)
 THEN RAISE EXCEPTION 'active merchandise curator required'; END IF;
 SELECT p.revision INTO rev FROM producer_v1_test.products p
 JOIN producer_v1_test.sellers s ON s.id=p.seller_id
 WHERE p.id=p_product AND p.owner_id<>actor AND p.status='approved' AND s.status='approved'
 AND EXISTS(SELECT 1 FROM producer_v1_test.product_decisions d WHERE d.product_id=p.id AND d.revision=p.revision AND d.decision='approved')
 FOR UPDATE OF p,s;
 IF rev IS NULL THEN RAISE EXCEPTION 'not eligible for merchandise'; END IF;
 INSERT INTO producer_v1_test.publication_targets(product_id,approved_revision,target,curator_approved)
 VALUES(p_product,rev,'merchandise',true)
 ON CONFLICT(product_id,target) DO UPDATE SET approved_revision=excluded.approved_revision,curator_approved=true;
END $$;
REVOKE ALL ON FUNCTION producer_v1_test.curator_approve_merchandise(uuid) FROM PUBLIC,producer_v1_actor,producer_v1_reviewer;
GRANT EXECUTE ON FUNCTION producer_v1_test.curator_approve_merchandise(uuid) TO producer_v1_curator;
COMMIT;
