# Marketplace V2 — Pre-install verification package
Date: 2026-10-18
Status: REVIEW ONLY / NO-GO. This is a non-executable assembly manifest, NOT permission to apply any SQL.

## Target and isolation
- Repository: echoesofhumanity/Echoes-5, main.
- Future test-only target: Supabase staging ymxpbkviadypsvahrqwt.
- Forbidden: production nlawhidxubnmoxtcxbiq, backup repository, legacy checkout modification, real settlement.
- Do not execute concatenated DRAFT files. Each contains deliberate fail-closed guards and unapproved logic.

## Canonical dependency manifest (proposed, not yet deployable)
1. docs/sql/marketplace-staging-v2-independent-catalog.DRAFT.sql
2. docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql
3. docs/sql/marketplace-staging-v2-seller-allocations.DRAFT.sql
4. docs/sql/marketplace-staging-v2-consolidated-integrity-guards.DRAFT.sql
5. docs/sql/marketplace-staging-v2-allocation-transition-guards.DRAFT.sql
6. docs/sql/marketplace-staging-v2-allocation-reconciliation.DRAFT.sql
7. docs/sql/marketplace-staging-v2-cart-normalization.DRAFT.sql
8. docs/sql/marketplace-staging-v2-ledger-event-reconciliation.DRAFT.sql — dependency on approved V2 ledger operation codes and trusted write isolation.
9. docs/sql/marketplace-staging-v2-atomic-checkout.DRAFT.sql — intentionally blocked.
10. docs/sql/marketplace-staging-v2-atomic-cancel.DRAFT.sql — intentionally blocked.
11. docs/sql/marketplace-staging-v2-rpc-access-guards.DRAFT.sql — grants LAST, intentionally blocked.

Do not include overlapping old integrity, reservation-transition or order-lifecycle drafts.

## Unimplemented prerequisites, not part of this package
- Approved V2 ledger operation CHECK extension and prevention of unauthorized service_role V2 ledger INSERT; account for TRUNCATE privileges.
- Approved synthetic distribution policy with versioned basis points; operating share at most 3%; no presumed 70/27/3 rule.
- Seller/stock administrative writer lock-order inventory and cross-writer concurrency proof.
- Explicit reservation expiration/consumption/refund policy. An expires_at field is not a refund worker.
- Dedicated reviewed migration and rollback plan; privilege/owner/EXECUTE/search_path audit.
- Fully balanced accounting journal design and exact cross-object ledger/event invariants.
- Syntax validation in isolated PostgreSQL environment; current draft status does not imply parse success.

## Invariant checklist
- One buyer-owned order, 1–50 distinct product lines, quantities 1–99; immutable snapshots; integer EC totals within safe range.
- One reservation per line; reservation product/quantity/order consistent with immutable line.
- One debit of negative order total on buyer wallet; one created event.
- One seller allocation per seller; gross equals sum of that seller's lines; allocations total equals order total.
- Cancellation: original debit exists, exactly one positive reversal, all reservations released once, stock restored once, allocations voided, one cancelled event; replay creates no writes.
- Wallet lock before balance check for legacy and V2; V2 products locked by ascending UUID; inspect seller-before-product ordering in other writers.
- No direct client table writes, no service-role bypass of trusted posting pathway.

## Synthetic acceptance matrix — must run only after separate approval
A01 two buyers compete for one remaining unit; at most one purchase succeeds.
A02 two same-buyer requests with same key and cart; exact replay; changed cart fails.
A03 different-buyer and different-seller multi-line cart; immutable totals and allocations reconcile.
A04 insufficient EC; no partial order, debit, inventory or event.
A05 suspended seller/unpublished product; no writes.
A06 two simultaneous cancels; one reversal and one restock, replay read-only.
A07 checkout vs cancellation on same wallet; serialized balances.
A08 cross-wallet reversed seller/product order; bounded lock wait, no deadlock.
A09 consumed or expired reservation; cancellation blocked pending explicit policy.
A10 orphan reservation, wrong seller gross, missing debit/reversal/event; fail closed.
A11 stock restoration near integer maximum; no overflow.
A12 unauthorized user, anonymous caller, direct table writes, service_role ledger bypass attempt; denied or NO-GO.
A13 force error at each write stage; full transaction rollback.
A14 legacy single-item checkout/cancel and wallet transaction history regression.
A15 migration rollback with synthetic fixtures; no production resources.
A16 verify pgcrypto extension schema, function ownership, ledger CHECK and grants before deploy.

## Execution decision
Current verdict: NO-GO. All tests above are planned, not executed. No DDL, DML, grants or V2 RPC activation is authorized. A future separate user approval must identify the exact reviewed staging migration and fixture/test SQL before execution.
