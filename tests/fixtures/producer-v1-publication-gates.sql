-- Disposable extension: immutable approved revision and public eligibility.
BEGIN;
ALTER TABLE producer_v1_test.products ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE producer_v1_test.product_decisions ADD COLUMN revision integer NOT NULL DEFAULT 1;
CREATE TABLE producer_v1_test.publication_targets (
 product_id uuid PRIMARY KEY REFERENCES producer_v1_test.products(id),
 approved_revision integer NOT NULL,
 target text NOT NULL CHECK(target IN ('marketplace','merchandise')),
 curator_approved boolean NOT NULL DEFAULT false
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
 IF p_target='merchandise' AND NOT p_curator_approved
 THEN RAISE EXCEPTION 'curator approval required'; END IF;
 INSERT INTO producer_v1_test.publication_targets(product_id,approved_revision,target,curator_approved)
 VALUES(p_product,rev,p_target,p_curator_approved)
 ON CONFLICT(product_id) DO UPDATE SET approved_revision=excluded.approved_revision,target=excluded.target,curator_approved=excluded.curator_approved;
END $$;
REVOKE ALL ON FUNCTION producer_v1_test.approve_publication(uuid,text,boolean) FROM PUBLIC,producer_v1_actor;
GRANT EXECUTE ON FUNCTION producer_v1_test.approve_publication(uuid,text,boolean) TO producer_v1_reviewer;
COMMIT;
