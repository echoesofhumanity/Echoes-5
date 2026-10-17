# Marketplace V2 — Stock Reservation, Concurrency and Cancellation Contract
Date: 17 October 2026
Status: REVIEW CONTRACT ONLY — no database migration, checkout activation or real commerce.

## Scope and dependencies
Applies only to independent ec_wallet.staging_v2_catalogue_products and V2 cart orders/lines/reservations. Existing staging_products and single-item checkout remain untouched. Depends on the independent catalogue draft, multi-item draft and integrity-guards draft. Neither this document nor those drafts proves a passing runtime test.

## Atomic checkout — mandatory server transaction
1. Derive buyer from verified auth context; reject unauthenticated callers. Accept only normalized unique V2 product UUIDs, quantities 1..99 (max 50 lines), and a UUID idempotency key; no client prices/sellers/totals.
2. Lock a buyer/idempotency coordination row or use a unique-key safe insert strategy. Same key + same canonical digest returns the prior committed result; same key + different digest fails. Concurrent first attempts must serialize without duplicate debit.
3. Lock wallet and catalogue product rows in one documented global order, product UUID ascending; all wallet-writing RPCs must share the wallet locking discipline. Do not hold locks while calling external services.
4. Recheck environment=staging, test_only=true, active/published, rights and policy approvals, seller verification/not suspended, price, revision and available stock under locks. Catalogue display is never authorization.
5. For each item, guarded UPDATE catalogue SET stock_available=stock_available-quantity, revision=revision+1, updated_at=transaction_timestamp() WHERE product_id=... AND stock_available>=quantity; assert exactly one updated row. Ensure checked arithmetic and aggregate <= JS safe integer.
6. Within the same database transaction create order, immutable price/seller line snapshots, reservation rows, ledger debit and order event. Assert order sum, wallet balance and ledger idempotency invariants. Commit all or rollback all; no partial order or stock deduction.
7. Seller/payable accounting and EC liability reconciliation require a separately reviewed design before enabling any V2 debit RPC.

## Reservation lifecycle
- A reservation is created only after guarded stock decrement inside checkout; state=reserved.
- Do not automatically return stock merely because expires_at passed. Expiration needs a server-owned idempotent transaction that checks order/payment state, locks order and products, and records an event.
- Cancellation requires eligible order state, ownership/authorization and matching original debit. Lock order and wallet consistently, then products in sorted order. Transition reserved -> released once, guarded stock increment once, EC reversal once and append cancellation event in the same transaction.
- Repeated cancellation must return prior cancellation status, never credit twice or restore stock twice. Consumed reservations require a separately designed return/refund process, not ordinary cancellation.
- Order cancellation and reservation expiry jobs must serialize on the same order; no double release.

## Integrity and access gates
- Composite FK (product_id,seller_id) ensures product/seller identity; it does not validate seller verification.
- Inventory invariants need a tested state machine and server-only writes. Prevent arbitrary direct catalogue stock edits by non-trusted roles.
- Existing reservation CHECK constraints permit some incomplete transitions; add reviewed guards/triggers before execution.
- Current event history supports only created/cancelled; expiry/fulfilment events need a deliberate event schema extension.
- Existing total guard checks sum(lines), not ledger debit or reserved quantity; reconcile separately.
- RLS on all new tables, revoke client table privileges, audit SECURITY DEFINER search_path, function EXECUTE grants and service-role writers.

## Required synthetic adversarial tests
S01 two buyers last unit: exactly one success, never negative stock.
S02 same buyer simultaneous identical idempotency key: one debit/order.
S03 same key different cart: reject, no side effects.
S04 wallet insufficient after competing checkout: at most one debit.
S05 checkout failure after stock update: full rollback.
S06 cancel twice concurrently: one reversal and one release.
S07 cancel versus expiry: only one release.
S08 stale price/revision: reprice/reject according to explicit policy.
S09 seller suspended during checkout: deny after locked eligibility recheck.
S10 forged seller or demo product ID: deny.
S11 cross-product reverse request order: deterministic lock order, no deadlock.
S12 privileged writer concurrency: no lost wallet update.
S13 reservation consumed then cancel: reject ordinary cancellation.
S14 arithmetic upper bound and 50-line boundary: safe reject.
S15 legacy single-item checkout and demo cart regression unchanged.

## NO-GO
Do not run draft SQL or activate V2 RPCs before the inventory state machine, ledger accounting, lock-order protocol, access grants, failure tests and migration/rollback review are approved. No real payment, fiat EC redemption, production inventory or shipping.
