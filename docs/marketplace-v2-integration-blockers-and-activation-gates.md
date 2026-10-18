# Echoes Marketplace V2 — integration review and activation gates
Date: 2026-10-18
Status: review-only; NO SQL execution, no grants, no staging/production changes.

## Source of truth
- docs/sql/marketplace-staging-v2-atomic-checkout.DRAFT.sql
- docs/sql/marketplace-staging-v2-atomic-cancel.DRAFT.sql
- docs/sql/marketplace-staging-v2-seller-allocations.DRAFT.sql
- docs/sql/marketplace-staging-v2-allocation-transition-guards.DRAFT.sql
- docs/sql/marketplace-staging-v2-allocation-reconciliation.DRAFT.sql
- docs/sql/marketplace-staging-v2-consolidated-integrity-guards.DRAFT.sql

## Findings that block an executable demo
1. Checkout inserts order, lines, reservations and debit but DOES NOT insert seller allocations. Deferred reconciliation would reject commit. A versioned, approved integer-EC distribution policy and deterministic rounding are needed. Do not invent percentages.
2. Existing ledger operation CHECK excludes cart_checkout_debit_v2 and cart_checkout_reversal_v2. Review and approve an isolated migration with no changes to legacy operation semantics.
3. Both RPC drafts intentionally raise exceptions before writes and again at their ends; both SQL files also fail before DDL. They are not operational.
4. The cancellation replay branch checks reversal and state, but must additionally require at least one order line, a reservation for every line, exactly one reservation per line, one allocation per seller, and one original debit; otherwise vacuous empty-set checks could accept corrupt records.
5. Cancellation validates reservation states but not duplicate reservations per line. Releasing duplicates could over-credit inventory. Enforce one-to-one uniqueness at schema level and validate counts in RPC.
6. Allocation transition trigger locks the parent order FOR UPDATE; audit lock hierarchy with wallet -> order -> seller -> product across all writers. Checkout currently wallet -> seller -> product; cancellation wallet -> order -> product. Ensure no inverse locks or deadlocks.
7. Reservation expiry is a timestamp, not an approved automatic release/refund policy. No expiry worker or auto-refund is authorized.
8. Direct service-role/table-owner writes and ledger write privileges require audit; a row trigger is not sufficient to guarantee all writers acquire wallet locks.
9. Reconciliation currently compares order/line/allocation totals but does not prove a matching wallet debit or reversal. Add approved ledger reconciliation checks and transaction-level adversarial tests.
10. Checkout's 30-minute reservation expiry needs an explicit policy decision; test-only demo may use manual cancellation without automatic expiry, but must not silently treat expiry as refund.
11. Check event table required columns/defaults and PostgreSQL extension location before any migration. SQL drafts are not syntax- or runtime-validated.

## Minimum implementation sequence (before any staging migration)
A. Agree on a synthetic allocation policy or an explicitly approved zero-split test-only policy; document version and rounding. No implicit economic policy.
B. Correct uniqueness, replay evidence, guard/lock ordering and stock overflow checks in draft SQL.
C. Integrate allocations into checkout and reversal/void into cancellation with all hard stops retained until independent review.
D. Assemble ONE ordered staging-only migration, avoiding duplicate older guard triggers; include ledger operation CHECK update and least-privilege RPC grants.
E. Prepare reproducible synthetic fixtures and acceptance tests: multiple sellers, duplicate cart, insufficient EC, concurrent checkouts, double cancellation, malicious buyer, partial reservations, overflow, rollback, reconciliation, legacy regression.
F. Obtain explicit informed user approval identifying staging project and exact migrations before executing ANY DDL, grants or test-data writes.
G. Run staging tests; only after green results connect the V2 demo UI. Production stays unchanged.

## Non-goals
No real payments, no live payout, no production migration, no alteration of existing single-item checkout, no new financial distribution percentages.
