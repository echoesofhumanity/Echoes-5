# D2 — Digital product acceptance and rights: review checklist

Status: DRAFT SQL COMMITTED, NOT DEPLOYED, NOT TESTED IN DATABASE.

## D2 schema prepared
See docs/sql/marketplace-digital-d2-staging-schema.sql. New isolated staging namespace echoes_digital_stage, no production schema changes.

Entities: creators (private identity and publication consent), stores (creator ownership), digital_listings (ebook/audio/digital_art, EC reference price, licensing and publication status), listing_localizations (9 languages), digital_assets (private object keys, size, MIME and SHA-256), rights_evidence (private), review_events (audit history).

Safety defaults: checkout_enabled=false constrained by SQL; RLS enabled and forced on every table; no public, anon or authenticated grants or policies. No publicly accessible downloads or payments.

## What schema constraints already guarantee
- A listing store and creator must match through composite FK.
- Duplicate store slug, language localization and asset object key are blocked.
- Digital category, statuses, nine language codes and positive EC reference prices are constrained.
- Unreviewed listing does not become purchasable by changing a client flag.
- Raw protected asset keys are private table fields, not public catalog data.

## Required D2 implementation before marking accepted
1. Create isolated staging database and apply SQL only after authorization; inspect Postgres roles and schema privileges.
2. Build audited server-side submit/review/approve/publish procedures with separate role memberships. A creator cannot approve their own listing; a reviewer cannot bypass publisher authority.
3. Enforce allowed state transitions atomically in database transactions; review_events must be append-only and produced server-side, not trusted from browser.
4. Require verified creator, current publication consent, valid English fallback, approved rights evidence, approved preview and private deliverable before publication.
5. Add territory/license policy checks and revocation behavior; validate file MIME, size and malware scanning on upload.
6. Define and verify least-privilege public read projection: only approved published listings with consent and eligible stores; never return private_object_key, private_evidence_key or private_subject_id.
7. Validate multi-store ownership, concurrent approval, consent revocation, audit immutability, invalid formats, rejected files and unauthorized direct table access.
8. Check accessibility, translations and right-to-left behavior in client pages.
9. Review the SQL with security and data owner before applying to staging; production Supabase remains untouched.

## Evidence log
- 2026-11-28: Draft schema created in feature branch. Source review only.
- Staging migration: NOT RUN.
- RLS integration tests: NOT RUN.
- Producer A/B/C/D role tests: NOT RUN on this schema.
- Public catalog: NOT CONNECTED.
- Live commerce: DISABLED.

## D2 acceptance criteria
No approval until a separate staging environment has been tested with negative and positive permission cases, publication invariants, audit evidence and safe public projection. D9 remains the final live-sale gate.
