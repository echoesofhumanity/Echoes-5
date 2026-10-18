# Echoes Marketplace V2 — Consolidated closure audit and handoff
Date: 2026-10-18
Scope: echoesofhumanity/Echoes-5 main, staging read-only evidence. Production and backup excluded.
Status: STATIC REVIEW CLOSURE / RUNTIME NO-GO. This report does not authorize SQL execution.

## 1. Confirmed work
- Independent synthetic V2 catalogue, multi-line orders, reservations, events, seller allocations and checkout/cancel RPCs have GitHub DRAFT SQL.
- Fail-closed top-level guards and checkout/cancel posting hard stops intentionally prevent activation.
- Static code controls cover cart normalization, wallet locking, UUID-ordered product locking, idempotency replay evidence, cancellation replay, seller gross reconciliation, allocation component balance and 3% maximum operating share.
- Staging read-only inspection confirmed legacy checkout wallet→product and cancellation wallet→order→stock write paths; legacy checkout verifies seller status without locking the seller row.
- Staging read-only pg_trigger inspection found five non-internal triggers across ledger, orders, products and payables; none on the scoped seller and wallet tables. This does not prove privileged writers absent.
- Existing ledger CHECK does not permit proposed V2 operation codes. Existing legacy checkout remains unchanged.
- Earlier BigInt rounding vectors are JavaScript calculations, not PostgreSQL acceptance results.

## 2. Important gaps and contradictions
P0 / activation blockers:
1. No approved, versioned synthetic allocation policy; checkout cannot generate final seller allocations safely. Maximum operating share of 3% is a cap, not an approved allocation split.
2. V2 debit/reversal operation codes require a reviewed staging-only ledger CHECK migration; direct privileged ledger writers and wallet-lock isolation remain unproven.
3. DRAFT SQL is deliberately not executable; PostgreSQL syntax, migration ordering, ownership, privileges and deferred-trigger behavior are untested.
4. Atomic checkout/cancel, exact-once stock and EC reversal, failure rollback and concurrency have no PostgreSQL test evidence.
5. Privileged seller verification, stock, wallet and ledger writers are not exhaustively inventoried. Product→seller inversion and seller verification races are unresolved.
6. No approved reservation expiry/consumption/refund state machine or double-entry liability journal.
7. No approved isolated staging migration, fixtures, rollback procedure or test execution authorization.

P1 / review correctness:
8. Existing integration-blockers document states that ledger reconciliation is missing, but a newer ledger-event-reconciliation DRAFT exists; reconcile documentation without mistaking draft code for deployed enforcement.
9. Existing integration-blockers document states checkout does not insert seller allocations, but current checkout DRAFT includes an unreachable allocation INSERT candidate after a hard stop. Correct wording: allocation code is unapproved/unreachable and basis-point values are unresolved.
10. Cancellation draft checks event/line evidence and reservation identities, but this is static only. Deferred guards, replay and ledger constraints must be tested together.
11. Legacy seller verification is not held under a seller row lock; an administrative verification withdrawal race remains possible and requires a controlled test.

## 3. Closure matrix
| Workstream | Static design | Staging PostgreSQL tested | Verdict |
| --- | --- | --- | --- |
| V2 catalogue isolation | Drafted | No | NO-GO |
| Multi-item order and reservations | Drafted | No | NO-GO |
| EC ledger debit/reversal | Drafted; operation CHECK incompatible | No | NO-GO |
| Seller allocation / <=3% operating cap | Drafted; allocation split unapproved | No | NO-GO |
| Checkout/cancel idempotency | Drafted | No | NO-GO |
| Concurrency and lock ordering | Partial inventory | No | NO-GO |
| Legacy compatibility | Legacy SQL read-only inspected | V2 regression not run | NO-GO |
| Migration and rollback | Plan only | No | NO-GO |

## 4. One grouped next-stage execution package (NOT APPROVED TO RUN)
A. Policy decisions: versioned synthetic EC allocation rules, rounding, expiry/consumption policy, and journal architecture.
B. Static corrections: reconcile document contradictions, complete deferred reservation coverage and SQL dependency/privilege review, inspect full privileged writer inventory.
C. Build one isolated, reviewed staging-only migration and deterministic fixture suite; retain all hard stops until a separate approval.
D. Execute A01–A16 from docs/marketplace-v2-preinstall-verification-package.md in staging only after explicit informed approval, including concurrent requests, forced rollback, ledger isolation, exact-once cancellation and legacy regression.
E. Publish actual pass/fail evidence and only then decide whether to connect a synthetic V2 demo UI. Never auto-enable real commerce.

## 5. Handoff decision
GitHub static audit can be closed as a documented snapshot, NOT as implementation completion. The next session should address P0 blockers in grouped batches, not one tiny commit per message. Do not run SQL migrations, create fixtures or change grants without specific user approval identifying the staging project and exact proposed scripts. Production nlawhidxubnmoxtcxbiq and backup repository remain untouched.
