# Echoes Producer & Product Portal V1 — isolated implementation contract

Status: DESIGN / TEST BRANCH ONLY. No real merchant onboarding, publication, inventory, payments or EC transfers enabled.

## Reuse, do not duplicate
- Canonical baseline: docs/creator-product-model.md and docs/marketplace-merchandise-production-readiness-gates.md.
- Preserve Media Creator Portal. Reuse its submission/review interaction patterns only after verifying actual permissions and storage; never share media content approvals as product approvals.
- One producer identity and one canonical product record, with separate controlled publication targets (Marketplace store and optional official Merchandise collection).
- Existing concept/demo merchandise stays distinct and checkout-disabled.

## Roles
Producer: own profile, store and draft submissions only.
Product reviewer: review submitted evidence, request correction, approve/reject; cannot change ownership or financial settlement.
Merchandise curator: separate official collection approval, cannot override product safety review.
Operator: suspend/withdraw with recorded reason; no self-approval of own submission.
Public visitor: only published and consented fields, never private contact or payout details.

## Minimum workflow
1. Producer signs in; server verifies identity and ownership. Producer account may remain pending until verified.
2. Producer creates a private store draft and product draft (title, category, description, images with rights, physical/digital type, provenance, variants, stock/fulfilment plan and pricing proposal).
3. Submit snapshots an immutable revision; state draft -> submitted -> in_review.
4. Reviewer decides approved, changes_requested or rejected, with reason, timestamp, reviewer identity and audit event.
5. Approval alone does not sell: separate gates verify merchant eligibility, rights, tax/shipping/returns, stock and payment integration.
6. Eligible approved product can publish to its producer's Marketplace storefront. Merchandise publication needs a second, independent curator decision and brand rights approval.
7. Subsequent material changes require a new revision and re-review; existing public version remains unchanged or is paused based on risk.
8. Withdrawal/suspension removes public availability while preserving necessary order/audit records and producer consent rights.

## Proposed records (not yet installed)
producer_profiles(id, auth_user_id, verification_status, consent metadata)
stores(id, producer_id, slug, public display fields, state)
store_memberships(store_id, user_id, role)
product_drafts(id, store_id, owner_id, revision, status, fields)
product_assets(id, product_id, rights metadata, storage key)
review_decisions(id, product_id, revision, reviewer_id, decision, reason, created_at)
publication_targets(product_id, revision, target, state, curator_decision_id)
product_audit_events(id, actor_id, entity_id, action, timestamp)
Actual schema, RLS and migration must be validated against current staging before implementation.

## Mandatory acceptance tests
- Producer A cannot read/write B's private store, drafts or assets.
- Unauthenticated users cannot submit; users cannot self-approve or directly publish.
- Review decision applies to exact revision; editing after approval does not silently update public content.
- Marketplace approval does not imply Merchandise approval.
- Withdrawal/consent revocation hides optional public biography without erasing legally necessary accounting.
- No unsafe media upload, forged owner id, cross-store publication, or client-supplied approval state.
- Existing Media, Marketplace, Merchandise, demo cart and checkout remain unchanged.
- Real selling remains disabled until production readiness gates are separately evidenced.

## Implementation order
A. Verify actual Media Creator Portal permissions/storage and staging product tables (read-only audit).
B. Implement minimal producer/store/product draft schema and RLS in disposable or staging-only environment.
C. Add reviewer queue and decision audit; test cross-user and revision boundaries.
D. Build phone-friendly producer submission UI and reviewer UI in isolated branch.
E. Add approved publication projection to storefronts, then optional Merchandise curator path.
F. Synthetic mobile end-to-end acceptance and explicit release review.

No automatic merging or production activation.
