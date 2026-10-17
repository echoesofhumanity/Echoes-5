# Marketplace V2 — Independent Staging Test Product Catalogue Contract

Date: 17 October 2026
Scope: Echoes-5 main, Marketplace / Merchandise / EC only.
Status: DESIGN CONTRACT ONLY — no migration, deployment, checkout activation, or real payment authorization.

## 1. Strict environment and identity separation
- The existing synthetic demo catalogue remains `mode=synthetic_demo`, `status=concept`, `published=false`, `checkout_enabled=false`; its sessionStorage key and 60-minute expiry remain unchanged.
- V2 staging products belong to a separate, authenticated, server-controlled catalogue. Never promote a demo `concept_id` or `product_id` by toggling `published` or `checkout_enabled`.
- Allocate new immutable staging product UUIDs, with an explicit `environment=staging` and `test_only=true` marker in the server-owned projection. Neither a demo slug nor a client-provided price is a purchase identity.
- Production catalogues must be provisioned independently after legal, operational and security approvals; no staging record becomes production-saleable through a status flag.

## 2. Canonical staging product projection (proposed)
Required server-owned fields: `product_id` (UUID), `seller_id` (UUID), `environment` (staging), `test_only` (true), `publication_status` (draft/reviewed/published/paused/archived), `seller_verification_status`, `price_ec` (positive safe integer), `stock_available` (nonnegative integer), `currency_code` (EC), `updated_at`, `revision`, `product_type`, `fulfilment_mode`, `rights_review_status` and `policy_review_status`. Optional localized title/description and media metadata must be separately validated.
These fields specify the V2 API contract, not verified existing database columns. The inspected existing `ec_wallet.staging_products` has `product_id,title,price_ec,stock,active,seller_id,publication_status`; any additional fields require additive schema review, not assumed presence.

## 3. Eligibility rule
A product is eligible for *synthetic staging checkout tests only* when all of the following are independently verified server-side: authenticated authorized buyer; valid UUID product ID; product exists in the staging catalogue; `environment=staging` and `test_only=true`; active and published; verified and unsuspended seller; required product/policy/rights reviews passed; valid EC price; requested quantity between 1 and 99; sufficient unreserved stock; and no relevant suspension, restriction or expiry. A missing field, stale revision or failed verification is a denial, not an implicit approval.
Eligibility is recalculated atomically at checkout; catalogue display and browser selection are never authorization.

## 4. Checkout request boundary
The future client may send only a product UUID and integer quantity per line, plus an opaque idempotency key. Server derives buyer from authentication and resolves seller, price, tax/fees (if applicable), stock and EC totals. Reject unknown, duplicate, cross-environment or concept products, 0 or >99 quantities, >50 lines, unsafe arithmetic, manipulated prices and reused idempotency keys with different normalized carts. Sort product IDs deterministically for locking.
No existing single-item RPC may be silently repurposed for multi-item checkout. V2 requires separate reviewed atomic RPCs and transaction-safe inventory/ledger controls.

## 5. Non-authoritative display
Every V2 test product must be clearly labelled `TEST PRODUCT — NO REAL PURCHASE` in supported languages. Staging EC balances, mock orders and seller payables have no fiat redemption or real fulfilment promise. No card collection, real top-up, payout, shipping or tax invoice is authorized.

## 6. Required acceptance tests
C01 concept ID rejected by staging; C02 staging ID rejected by demo; C03 unpublished/paused/archived rejected; C04 unverified/suspended seller rejected; C05 cross-environment identity rejected; C06 forged price/stock/seller ignored or rejected; C07 missing policy/rights review rejected; C08 duplicate/oversized cart rejected; C09 quantity and arithmetic boundaries rejected; C10 stock race cannot oversell; C11 concurrent wallet debit cannot go negative; C12 same idempotency key returns same result; C13 changed cart with same key rejected; C14 cancellation restores stock and EC exactly once; C15 existing demo and one-item staging paths regress unchanged; C16 unauthorized user cannot read/write private staging catalogue; C17 stale catalogue display revalidated at checkout; C18 localized TEST label and RTL verified.
All tests remain PENDING until independently executed with evidence; this document records no passing test.

## 7. Implementation sequence and release gates
1. Review this contract against existing staging table constraints, grants, RLS, RPCs and projections read-only.
2. Draft additive staging-only schema/projection and server authorization; do not execute until reviewed.
3. Add isolated synthetic fixtures and automated tests; capture evidence in the existing V2 acceptance matrix.
4. Review security, legal, EC accounting, localization and operational readiness before any controlled sandbox release.
5. Keep real commerce NO-GO until all production readiness gates are evidenced and approved.

References: `docs/marketplace-v2-demo-cart-storage-eligibility-audit.md`, `docs/marketplace-staging-existing-schema-audit.md`, `docs/marketplace-multi-item-staging-schema-design.md`, `docs/marketplace-v2-acceptance-test-matrix.md`, `docs/marketplace-merchandise-production-readiness-gates.md`.

**NO-GO:** This contract does not enable purchase, wallet debit, payments, production inventory or seller settlement.
