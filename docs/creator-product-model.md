# Echoes of Humanity — Creator & Product Model (Draft v1)
Status: ARCHITECTURE ONLY. No database migration, payment, inventory or publication is activated.
Scope: Marketplace and Merchandise. English is canonical; localized public copy is a later, separate task.

## Founding rule
Echoes honors the work and dignity of real creators, not hardship as a sales technique. Maker-led, original production is the default. Exceptions for industrially manufactured items require a documented, independently reviewed human-benefit rationale; no personal medical information is required. No story or identity may be published without informed, revocable approval.

## Proposed entities (not yet database tables)
### Creator
- id: stable internal UUID
- public_display_name: optional, creator-chosen
- craft: creator-approved description
- public_region: optional and coarse, never exact home address
- public_biography: optional, creator-approved
- profile_image_asset_id: optional, permission-checked
- consent_version, consent_recorded_at, consent_revoked_at
- verification_status: pending | verified | suspended
- publication_status: draft | published | withdrawn
- recognition_status: none | nominated | honored (separate editorial process)
- private contact/payment details: isolated from public profiles; never embedded in static HTML

### Product
- id: stable UUID; creator_id: nullable until verified
- store: marketplace | merchandise
- title, description, category, product_type: physical | digital
- production_type: handmade | creator_original | approved_exception | undetermined
- provenance_notes and exception_approval_id: internal until reviewed
- asset_ids with rights/permission records
- variants: color, size, dimensions or digital format only when verified
- inventory/fulfillment: not configured in concept phase
- price_minor_units and currency: authoritative fiat amount when selling
- ec_display_amount: optional, illustrative while EC is not a regulated payment instrument
- state: concept | review | published | unavailable | retired
- checkout_enabled: false until verified product, licensed payment integration and compliance checks

### Creator-product relationship
- One creator may have many works; every published creator attribution must reference a verified creator with active publication consent.
- Multiple makers/collaborations need a separate contribution relationship in the eventual database, not a fabricated single maker.
- A creator may withdraw public biography or identity without losing rights to earned payment or removing legally required private accounting records.

### Recognition
- id, creator_id, type, decision_date, criteria, reviewer, public_text_approval
- Echo of the Month and Creator Honors are independent editorial recognitions; neither is purchasable or automatically earned by listing products.

## Publishing gates
1. Verify real maker, authorship, rights, provenance and product claims.
2. Obtain granular approval for public name, image, story and sensitive details, with an accessible withdrawal process.
3. Verify real photos, dimensions, variants, production and fulfillment.
4. Set fair maker remuneration, taxes, shipping and fiat checkout with appropriate provider.
5. Publish only after review. Concepts must remain clearly labeled Coming Soon and cannot accept orders.

## Security and implementation notes
- This document is a proposal, not an assertion that these tables or services already exist.
- Before implementing storage or payments, inspect the current Supabase schema, authentication/RLS, CMS workflows and repository HEAD. Never place service-role secrets or private data in GitHub Pages.
- EC remains a display unit for concepts. Any transferable wallet, redemption or monetary credit system requires legal and payment-provider review.
- Preserve current Merchandise UI and four tested concept cards; use one change → test → commit per implementation step.
