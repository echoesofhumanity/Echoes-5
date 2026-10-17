# Marketplace V2 — Staging RLS, grants and RPC boundary audit

Date: 17 October 2026. Read-only PostgreSQL catalog inspection of Supabase `echoes-response-staging` (`ymxpbkviadypsvahrqwt`); no SQL mutation. Production project untouched.

## Verified RLS state
`ec_wallet.ledger`, `ec_wallet.staging_orders`, `ec_wallet.staging_products` and `ec_wallet.staging_sellers` each have `relrowsecurity=true` and `relforcerowsecurity=false`. The inspected `pg_policies` query returned **zero policies** for these four tables. This is consistent with a private, RPC-mediated design; it is not proof of end-to-end authorization.

## Verified direct table grants
The inspected `information_schema.role_table_grants` query returned `service_role` privileges on all four tables (including SELECT/INSERT/UPDATE/DELETE). It returned no direct `anon` or `authenticated` grants for those tables. This is not an exhaustive privilege proof for inherited grants, schema exposure, or other objects. `service_role` is privileged; its key must never appear in browser code.

## Verified public RPC inventory
The following `public` functions exist:
- `ec_staging_checkout(p_product_id uuid,p_quantity integer,p_idempotency_key uuid)` — SECURITY DEFINER, owner postgres.
- `ec_staging_cancel_order(p_order_id uuid)` — SECURITY DEFINER, owner postgres.
- `ec_staging_catalogue()` — SECURITY DEFINER, owner postgres.
- `ec_staging_my_orders()` — SECURITY DEFINER, owner postgres.
- `ec_wallet_transactions(p_limit integer)` — SECURITY DEFINER, owner postgres.
- `ec_wallet_snapshot()` — SECURITY INVOKER, owner postgres.
All inspected functions have an explicitly configured search_path; their full definitions, role EXECUTE grants and authorization logic were not verified in this pass.

## Risk and next required evidence
1. Review each SECURITY DEFINER function body for `auth.uid()`, ownership, seller status, price/stock validation, idempotency, exception handling, transaction and ledger effects. Function ownership and search_path alone do not establish safety.
2. Confirm exact EXECUTE privileges for `PUBLIC`, `anon`, `authenticated` and `service_role` through independently reviewed catalog evidence; a follow-up privilege query was blocked by the tool security controls, so **no conclusion is drawn** about effective RPC access.
3. Review triggers, constraints and indexes on ledger/orders/products, including immutability, seller ownership, and refund uniqueness.
4. Verify schema/API exposure, RLS for any new V2 objects, no direct browser writes, and that future V2 RPCs are separate from current single-item RPCs.
5. Run authorized negative tests against isolated synthetic staging identities only after test setup and explicit approval.

## Decision
**NO-GO** for V2 checkout activation and real payments. Existing RPCs and tables were not changed. No security test is claimed passed.

References: `docs/marketplace-v2-staging-catalog-schema-gap-review.md`, `docs/marketplace-v2-independent-staging-catalog-contract.md`, `docs/marketplace-staging-security-audit.md`.
