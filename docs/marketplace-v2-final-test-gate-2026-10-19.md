# Marketplace V2 — test phase gate (2026-10-19)

## Verified green CI
- Offline synthetic model: 15/15 Node tests, 13/13 static SQL safety checks. Run 39181844462.
- Disposable PostgreSQL single-item transaction fixture: run 39244752127 passed.
- Disposable PostgreSQL two-product/two-seller fixture: run 39248000438 passed.
- Disposable PostgreSQL last-unit two-session race: run 39248892804 passed.
- Disposable PostgreSQL simultaneous cancellation race: run 39249159420 passed.

## Honest scope
The PostgreSQL jobs exercise disposable **simplified fixture tables/functions**, not the production-ready V2 schema or approved RPCs. They do not prove Supabase RLS, grants, production-grade auth, 50-item carts, malicious client input, or live portal wiring. No staging or production database writes occurred.

## Remaining release blockers (one bounded work package)
1. Finalize independent V2 test-only schema: catalogue/sellers, wallet, order/lines, reservations, journal, clearing, with correct FKs, guards and privileges.
2. Implement real V2 checkout/cancel RPCs against that schema, including authenticated fixture identity, idempotency, lock order, rollback and reconciliation.
3. Execute end-to-end disposable PostgreSQL tests **against those actual V2 definitions** (not simplified lookalikes), including concurrency, permissions and rollback.
4. Obtain explicit approval for staging installation; then run synthetic staging smoke tests and controlled portal integration. No live activation before these gates.

## Decision
**Fixture regression suite: PASS. Marketplace V2 release: NO-GO.**
Stop writing additional broad architecture notes. Focus implementation and tests on these four blockers only. No seller allocation or real EC transfer is authorized.
