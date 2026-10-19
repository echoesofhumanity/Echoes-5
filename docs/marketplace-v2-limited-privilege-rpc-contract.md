# Marketplace V2 — Limited-Privilege RPC Security Contract

Status: DESIGN / REVIEW ONLY. No browser access, no grants, no live EC, no production migration.
Target: isolated staging schema `echoes_v2_synthetic`. This document is not permission to activate endpoints.

## Existing verified state
- Eight isolated synthetic tables have RLS enabled and FORCE RLS.
- `anon` and `authenticated` have no schema USAGE, table DML, or checkout/cancel EXECUTE.
- Private `checkout_authenticated` and `cancel_authenticated` are SECURITY INVOKER; they are intentionally nonfunctional for browser clients without additional permissions.
- Checkout/cancel internal functions currently accept caller-supplied buyer UUID. They must remain inaccessible to browser roles.

## Trust boundaries
1. Real Supabase API gateway must validate the JWT before forwarding requests. Never treat a SQL-client-set `request.jwt.claim.sub` as proof of authentication.
2. Client requests supply only `request_key`, canonical cart, or order ID; buyer identity is derived from verified request context using `auth.uid()`.
3. Reject NULL `auth.uid()`, anonymous users, malformed cart, foreign order, and missing synthetic wallet. Do not accept arbitrary `buyer` from the browser.
4. Grant EXECUTE on **only** dedicated authenticated public API entry points. Do not grant EXECUTE on raw `checkout(buyer,...)` or `cancel(buyer,...)`.
5. Prefer an unexposed internal schema and an explicitly exposed staging-only API schema after checking Supabase Data API exposed schemas. Merely granting EXECUTE on an unexposed schema does not create a working REST endpoint.
6. Use a dedicated NOLOGIN, NOBYPASSRLS function-owner role with narrowly granted table privileges and explicit ownership-based RLS policies for the operations needed. Do not use the default postgres/BYPASSRLS owner as a shortcut. SECURITY DEFINER is permissible only for reviewed API wrappers, with SET search_path='', schema-qualified references, verified caller identity, and an audited grant matrix.
7. Internal functions called by a definer wrapper run with the definer role; ensure that role can execute those functions and that the role's RLS policies cover SELECT/INSERT/UPDATE paths. FORCE RLS stays enabled. Do not give PUBLIC EXECUTE via default function grants.
8. Protect fixture creation separately from checkout. Only approved test harness identities may create synthetic sellers, products or wallets; never expose arbitrary balance-credit operations.
9. No EC transfer, seller payout, real payment, entitlement, or production wallet reference. Clearing remains single pending/voided, unallocated.

## Required security gates before any API grants
- Verify `pg_roles` for owner NOLOGIN and NOBYPASSRLS; verify schema exposure configuration.
- Enumerate privileges via `has_schema_privilege`, `has_table_privilege`, `has_function_privilege`; check PUBLIC defaults.
- Verify RLS policies for each table; deny cross-buyer access and arbitrary balance changes.
- Real signed Supabase Auth test: valid user A checkout and cancel own order, user B cannot cancel A, no JWT/anon denied, replay/cancel idempotent, concurrent last-unit checkout, double cancel, journal reconciliation, rollback on any failure.
- Verify gateway role mapping and real JWT claims; do not mistake a SQL GUC spoof test for JWT verification.
- Confirm production/legacy endpoints and portal remain unchanged.
- Perform review of authorization and money invariants before any enabling of bridge or API grants.

## Activation sequence
A. Design and test owner/RLS/API wrappers on disposable PostgreSQL with separate roles.
B. Review resulting SQL and negative tests; explicitly identify migration scope.
C. Deploy staging-only private owner/RLS/wrappers; verify no public grants.
D. Verify real Supabase JWT through a staging-only authenticated client with no secret keys in browser.
E. Only after passing tests, authorize narrow API grants and staging-only bridge switch separately.

Rollback: revoke API EXECUTE and schema USAGE first; disable bridge; preserve synthetic audit data for review. Do not drop production objects.
