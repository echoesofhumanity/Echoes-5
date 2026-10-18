# Echoes Marketplace V2 — Staging Migration Assembly & Test Plan
Date: 18 October 2026
Status: DESIGN / NO EXECUTION. No staging or production SQL migration approved.

## Read-only repository findings
The following draft files were inspected on GitHub main:
1. docs/sql/marketplace-staging-v2-independent-catalog.DRAFT.sql
2. docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql
3. docs/sql/marketplace-staging-v2-integrity-guards.DRAFT.sql
4. docs/sql/marketplace-staging-v2-reservation-transition-guards.DRAFT.sql
5. docs/sql/marketplace-staging-v2-order-lifecycle-guards.DRAFT.sql
6. docs/sql/marketplace-staging-v2-rpc-access-guards.DRAFT.sql
7. docs/marketplace-v2-acceptance-test-matrix.md

## Confirmed assembly conflicts / blockers
- Both integrity-guards and reservation-transition-guards create separate triggers for order-line UPDATE/DELETE and event UPDATE/DELETE. Choose ONE implementation of each. Do not install duplicate immutability triggers.
- The old integrity-guards draft starts with BEGIN, not a fail-closed review guard. It must not be treated as an approved migration.
- The reservation-transition and order-lifecycle drafts intentionally RAISE EXCEPTION before DDL. They are review artifacts, not runnable migrations.
- The RPC-access draft also intentionally raises an exception and references functions that do not exist yet. Its grants must come only AFTER reviewed V2 RPC creation.
- Deferred order-total trigger in integrity-guards checks line count 1..50 and sum of line subtotals equals order total; preserve this invariant, but review serialization of order header and line insertion, and numeric overflow.
- V2 order status currently supports only created/cancelled. Reservation states also include consumed and released with expiration reason. Do not implement automatic expiry/cancel/refund until the full lifecycle and consumed-item policy are approved.
- Reservation guard checks line quantity and one-way state transitions, but cannot itself prove stock restock or ledger reversal.
- V2 ledger operation CHECK does not yet allow proposed operation codes. Existing wallet global idempotency uniqueness requires collision tests.
- Existing staging service_role grants allow direct ledger INSERT; no claim of comprehensive enforcement until privileged writers are audited.

## Single target assembly order (future, approval required)
Phase 0: Capture staging-only baseline, privileges, current RPC signatures, schema checksums, rollback approach and synthetic test identities.
Phase 1: Independent V2 catalogue (additive table; RLS enabled; no client grants).
Phase 2: V2 order header, immutable lines, events and reservations (additive tables; no client grants).
Phase 3: Consolidated integrity guards: ONE line immutability trigger, ONE event immutability trigger, deferred order-total assertions, order-header guard, reservation insert/transition guard. Review all function EXECUTE defaults.
Phase 4: Explicitly reviewed ledger operation CHECK change and service-role write isolation; separately reviewed synthetic seller payable journal.
Phase 5: Fully implemented atomic checkout/cancel RPCs; lock wallet then order (for cancel) then product rows sorted by UUID; grant EXECUTE to authenticated only after function-level review.
Phase 6: Run acceptance tests, concurrency tests, cancellation/reversal reconciliation, least-privilege and legacy single-item regression.
Phase 7: Independent go/no-go decision; do not infer production readiness from staging.

## Acceptance gates (testable)
T01: Anonymous and direct authenticated table writes to all V2 tables denied.
T02: Authenticated user cannot checkout/cancel another user's order or wallet.
T03: Cart 1..50 distinct products, each qty 1..99, EC arithmetic bounded by JS safe integer, duplicate IDs rejected.
T04: Seller suspended, product unpublished, changed revision or stale price -> fail without ledger/stock/order side effects.
T05: Insufficient balance and out-of-stock -> fail atomically.
T06: Two buyers racing for final stock unit -> at most one successful purchase; no negative stock.
T07: Same buyer+idempotency UUID+same digest -> replay exact order; same key+different digest -> reject.
T08: Global wallet ledger idempotency collision across legacy and V2 -> reject without writes.
T09: Successful multi-seller order -> order total equals immutable lines, one debit, correct reservations, reconciled synthetic payable allocations.
T10: Cancellation of eligible reserved order -> one reversal of original total, exactly-once stock restore, exactly-once event/payable void; replay is read-only.
T11: Consumed reservation -> ordinary cancellation cannot restore stock or post refund without separately approved policy.
T12: Inject failure after any write step -> all writes rolled back.
T13: Direct service_role ledger INSERT bypass attempt -> demonstrate mitigation or mark NO-GO; existing grants alone do not prevent this.
T14: Legacy single-item checkout, cancellation and ledger views continue working unchanged.
T15: Review trigger owner/EXECUTE/search_path and default PUBLIC grants; no accidental V2 RPC exposure.
T16: Verify migration rollback on staging with synthetic data and no production credentials.

## Explicit NO-GO conditions
Any duplicate trigger assembly, unreviewed SQL execution, privileged ledger writer bypass, partial debit/reversal, unbalanced synthetic seller allocation, untested consumed-item policy, client-side purchase authority or failed legacy regression.

## Next implementation deliverable
Produce ONE consolidated, review-only staging migration with explicit fail-closed execution guard, deduplicated triggers, verified dependencies and a separate rollback/test harness. This document is not that migration and does not authorize execution.

## Updated dependency graph and explicit NO-GO (18 October 2026)
This supersedes the earlier generic phase order; it is NOT an executable migration.

1. Read-only baseline: staging extensions, ledger CHECK, grants, role ownership, legacy RPC signatures, table presence.
2. Independent V2 catalogue table.
3. Multi-item order/line/event/reservation tables (now fail-closed, one event per order and type; reservation line_id already UNIQUE).
4. Synthetic seller allocation table, then allocation transition guards.
5. Consolidated order/line/event/reservation guards. DO NOT apply the three overlapping legacy guard drafts.
6. Deferred allocation reconciliation guards (requires allocation table and lines).
7. Cart normalization function (must precede checkout function).
8. Reviewed ledger operation CHECK extension and audited ledger writer isolation. Existing CHECK does not admit cart_checkout_debit_v2 or cart_checkout_reversal_v2.
9. Checkout and cancel functions only after approved allocation policy, lock-order audit and full posting/replay reconciliation. Both currently hard-raise; checkout policy basis-point variables are deliberately NULL.
10. RPC grants LAST and only after fully verified execution, security and tests; grants draft currently hard-raises.

### Cross-object acceptance invariants
- Every order has 1..50 immutable lines, each with exactly one reservation, and exactly one created event.
- Exactly one allocation per distinct seller; per-seller gross equals its immutable line subtotals, total allocations equals order total.
- Every created order has one matching wallet debit of -total_ec; every cancelled order has exactly one matching +total_ec reversal and one cancelled event.
- Cancelled orders have only released reservations (reason order_cancelled), voided allocations, no duplicate restock.
- Existing deferred allocation reconciliation does NOT enforce wallet debit or event count. Add reviewed cross-object checks before enabling RPCs.
- Global lock order, ledger writer permissions, and legacy checkout compatibility must be tested under concurrency.

### Evidence and approval boundary
- The rounding test vectors are exact-integer arithmetic checks, NOT PostgreSQL tests.
- SQL review drafts contain intentional RAISE EXCEPTION blockers. Do not concatenate them and execute; a future migration must be assembled and separately reviewed with an explicit user approval.
- No staging DDL, synthetic inserts, grants, function deployment or production changes are authorized by this document.
