# Marketplace V2 — UNSPLIT-TEST-ONLY-v0 PostgreSQL RPC acceptance contract
Date: 2026-10-19 · REVIEW ONLY · NO-GO for installation

## Boundary and current evidence
GitHub Actions run 39174232478 completed successfully for the 15 isolated synthetic Node.js checkout/cancel tests and the static fail-closed SQL draft checks. These do **not** prove PostgreSQL transactional correctness, concurrent safety, RLS, or compatibility with existing writers.

Production Supabase, staging Supabase and the backup repository are excluded from writes. This document does not approve SQL deployment, RPC creation, migration, ledger posting, or real economic transactions.

## Required isolated V2 interface (proposal; not deployed)
- Checkout: `ec_wallet.staging_cart_checkout_unsplit_test_v2(p_request_key uuid, p_cart jsonb)`.
- Cancel: `ec_wallet.staging_cart_cancel_unsplit_test_v2(p_order_id uuid, p_request_key uuid)`.
- Use authenticated buyer identity from a trusted server context; no caller-supplied buyer ID. Authorize ownership and avoid exposing a privileged definer endpoint without narrowly scoped grants and reviewed checks.
- Both operations must be atomic and idempotent; repeated request with different canonical payload must fail without changes.
- Explicit approved TTL is required. Expired reservations are held for manual resolution; never silently restock, refund or void.
- All catalogue items must be independently approved synthetic/test-only products, seller active and authorized; 1–50 unique product IDs, quantities 1–99. Canonical request digest must not depend on client ordering.

## Checkout transaction invariants
1. Acquire buyer wallet lock first; then lock seller rows in deterministic ID order and product rows in deterministic ID order. Compare lock order with all existing writers before deployment.
2. Check available EC, stock, product/seller status and immutable price snapshots while holding locks. Use bounded numeric arithmetic; reject overflow.
3. In one transaction write V2 order, lines, inventory reservations, decrement stock, exactly one buyer ledger debit, exactly one **unallocated pending clearing** row for the full order amount, and exactly one created event.
4. No seller allocation, humanitarian share, operating share, entitlement, payout or real-money settlement is written.
5. On any failure, every mutation rolls back. A replay checks all persisted evidence before returning the prior order.

## Cancellation transaction invariants
1. Authenticate and lock buyer wallet and owned order; validate unconsumed reservation, time limit and existing debit evidence.
2. Lock affected sellers/products in the same global order. Restore stock exactly once, create one full EC reversal, release every reservation, void the single clearing row and write one cancelled event, atomically.
3. Cancellation replay must verify reversal, stock/reservation, clearing and event evidence; never issue a second refund.
4. Reject wrong buyer, consumed reservation, expired order, missing debit, duplicate reversal, missing clearing, invalid stock or numeric overflow without partial effects.

## Migration and verification gates (all currently OPEN)
- [ ] Confirm read-only staging schema: exact table columns, keys, constraints, triggers, privileges, RLS, extensions and existing writer lock order.
- [ ] Resolve ledger operation CHECK mismatch and prove uniqueness/idempotency for debit and reversal.
- [ ] Resolve existing seller-allocation reconciliation conflict: UNSPLIT and allocation-based triggers must be mutually exclusive.
- [ ] Review all SECURITY DEFINER permissions, `search_path`, trusted buyer identity and SQL injection/privilege boundaries.
- [ ] Author separate fail-closed UNSPLIT RPC review drafts; do **not** reuse allocation-based RPCs.
- [ ] Test on separately authorized disposable PostgreSQL fixture: successful checkout/cancel, rollback, replay, cross-buyer access, expiry, inventory and wallet contention, deadlocks and event/clearing reconciliation.
- [ ] Obtain explicit approval before **any** staging write or migration.

## Release decision
**NO-GO.** CI passing means offline reference and static review pass only. No DB activation is authorized.
