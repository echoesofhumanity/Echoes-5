# Marketplace V2 — Staging catalogue schema gap and rollout review

Date: 17 October 2026
Scope: echoesofhumanity/Echoes-5 main and read-only metadata query of Supabase project `echoes-response-staging` (`ymxpbkviadypsvahrqwt`). Production project untouched.
Status: VERIFIED INVENTORY + PROPOSAL ONLY. No DDL, data changes, checkout activation or migration execution.

## Verified staging column inventory
`ec_wallet.staging_products`: `product_id uuid NOT NULL`, `title text NOT NULL`, `price_ec bigint NOT NULL`, `stock integer NOT NULL`, `active boolean NOT NULL`, `seller_id uuid NULL`, `publication_status text NOT NULL`.
`ec_wallet.staging_sellers`: `seller_id uuid NOT NULL`, `display_name text NOT NULL`, `owner_id uuid NULL`, `verification_status text NOT NULL`, `created_at timestamptz NOT NULL`.
The inspected column query returned **no columns** for `staging_cart_orders_v2` or `staging_cart_order_lines_v2`; it does not by itself prove anything about other schemas or deployed RPCs.

## Gaps against the independent V2 catalogue contract
- Product has no explicit `environment`, `test_only`, `revision`, `rights_review_status`, `policy_review_status`, `product_type`, `fulfilment_mode` or `updated_at` in inspected columns.
- Seller `verification_status` exists, but no explicit suspension field was observed. Verification semantics, triggers and privileges need separate evidence.
- `seller_id` and seller `owner_id` are nullable: V2 eligibility must fail closed for missing ownership and seller identity.
- `price_ec bigint` exceeds JavaScript safe integer range. Server validation must bound values to safe integer arithmetic or adopt an explicit decimal/string transport contract; never coerce unsafe values into JS Number.
- Current multi-item draft `docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql` permits quantity 1–100; independent V2 contract specifies 1–99. Align both order-line and reservation limits **before** any migration review; do not change live schema.
- No assumption that column presence proves RLS, ownership, grants, triggers, seller publication enforcement, or transaction isolation.

## Recommended additive design — not executable SQL
1. Prefer a dedicated V2 staging catalogue projection or additive, server-owned metadata table keyed by existing `staging_products.product_id`; avoid altering demo catalogue or overwriting legacy product identity.
2. Define explicit `environment=staging`, `test_only=true`, review and suspension state, revision and timestamps. Make missing metadata ineligible, never eligible by default.
3. Use a private schema, no direct browser writes, RLS defense in depth, and a separately reviewed authenticated server read interface. Never expose service-role keys.
4. Derive eligibility from authenticated identity, product metadata, seller verification, publication, current price and reserved stock in the same server-controlled transaction.
5. Keep future multi-item checkout/cancellation RPCs separate from existing single-item RPCs; require deterministic locks, idempotency, immutable events and EC reconciliation.
6. Before authoring migration, inspect actual constraints, triggers, RLS, grants, publication-status allowed values and existing RPCs. Run negative tests and verify rollback on isolated staging only after explicit approval.

## Release status
**NO-GO** for V2 checkout, real commerce, payouts, EC issuance and production deployment. Existing synthetic cart and single-item staging flow must remain unchanged.

References: `docs/marketplace-v2-independent-staging-catalog-contract.md`, `docs/marketplace-staging-existing-schema-audit.md`, `docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql`, `docs/marketplace-v2-acceptance-test-matrix.md`.
