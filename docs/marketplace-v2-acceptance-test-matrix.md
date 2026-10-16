# Marketplace v2 — acceptance test specification (design only)

Date: 17 October 2026. Applies to `docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql`. **No database migration or live purchase is authorized.** All test identities, balances, products and orders must be synthetic.

## Baseline and test isolation

Before executing any test, record staging project ID, schema version, migration checksum, existing RPC signatures, table grants and a rollback snapshot. Never use production identities or money. The draft currently contains tables only, with no v2 checkout/cancel RPC; therefore transaction tests below are **pending implementation**, not passing tests.

## Acceptance matrix

| ID | Scenario | Required result | Status |
|---|---|---|---|
| T01 | Anonymous user reads or writes v2 tables | Access denied | Pending execution |
| T02 | Authenticated buyer reads or writes v2 tables directly | Access denied; future RPC enforces ownership | Pending execution |
| T03 | Buyer requests another buyer's order or cancellation | No disclosure or mutation | Pending implementation |
| T04 | Valid cart with 2 products from different verified sellers | One order, two frozen lines, one atomic EC debit, accurate seller obligations | Pending implementation |
| T05 | One product unavailable or seller suspended | Whole checkout rejected, no partial stock or ledger changes | Pending implementation |
| T06 | Insufficient EC balance | No order, debit or stock reservation | Pending implementation |
| T07 | Same idempotency key + identical normalized cart retried | Same order returned, no duplicate debit/reservation | Pending implementation |
| T08 | Same idempotency key + different cart | Rejected with no side effects | Pending implementation |
| T09 | Two buyers race for last unit | At most one succeeds; no negative stock | Pending implementation |
| T10 | Same buyer races two carts exceeding balance | At most affordable transactions succeed; no negative EC balance | Pending implementation |
| T11 | Two simultaneous cancellations of one order | One credit and one stock restoration only | Pending implementation |
| T12 | Cancel after reservation expiry or terminal state | Only explicitly permitted transition; no duplicate reversal | Pending policy decision |
| T13 | Overflow quantity * price or sum of subtotals | Rejected before persistence | Pending implementation |
| T14 | Forged client price, seller, buyer or total | Server ignores/rejects forged values | Pending implementation |
| T15 | Insert line with subtotal inconsistent with unit price | Database CHECK rejects | Pending execution |
| T16 | Insert duplicate product in same order | Unique constraint rejects | Pending execution |
| T17 | Reservation references mismatched order/product/line | Composite FK rejects | Pending execution |
| T18 | Reservation expires before reservation time | CHECK rejects | Pending execution |
| T19 | Direct updates/deletes of order event history | Must be rejected by immutable-event trigger | **Not yet implemented** |
| T20 | Line snapshots or order totals changed after checkout | Must be rejected by server/DB invariants | **Not yet implemented** |
| T21 | Sum(lines) differs from order total | Must be rejected transactionally | **Not yet implemented** |
| T22 | Product-seller relationship mismatched | Must be rejected server-side/DB invariant | **Not yet implemented** |
| T23 | New v2 tables have RLS and no client grants | All four pass metadata checks | Pending execution |
| T24 | Existing EC single-product checkout/cancel, wallet snapshot and history | Existing behavior unchanged | Pending regression test |
| T25 | Audit evidence for seller distribution, double-entry liabilities and settlement | Reconciles or blocks real commerce | **Not yet implemented** |

## Static design review: important limitations

1. The draft's order status and reservation state are not tied together by a server-side state machine.
2. The draft does not yet prevent edits to historical order lines/events by privileged code; RLS and revoked browser grants alone do not ensure immutability.
3. The order total is not automatically compared to the sum of its lines.
4. A line's seller_id is not automatically compared to the current product owner; immutable seller snapshots require explicit authorization and consistency checks.
5. The proposed `expires_at` timestamp is not an expiry scheduler; release must be atomic and idempotent.
6. No v2 EC debit or refund operation exists. Existing one-item RPCs must not be reused for a multi-item cart without redesign.
7. The v2 draft is additive but is **not approved for execution**. A migration must include a safe rollback plan and be separately reviewed.

## Evidence protocol

For every test capture: scenario ID, timestamp, staging project, migration revision, synthetic actor role, request payload digest, observed SQLSTATE/API status, affected row counts, ledger deltas, stock before/after, and pass/fail reviewer. Never publish secrets, bearer tokens, personal data or full user IDs in repository evidence.

## Go/no-go

**NO-GO** until all applicable test rows pass, privileged functions and triggers are reviewed, financial/legal policy is approved, and staging regression evidence exists. Passing schema CHECK tests alone does not authorize checkout or payments.
