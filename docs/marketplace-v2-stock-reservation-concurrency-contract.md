# Marketplace V2 — Stock Reservation, Concurrency and Cancellation Contract
Date: 17 October 2026
Status: REVIEW CONTRACT ONLY — no database migration, checkout activation or real commerce.

## Scope and dependencies
Applies only to independent ec_wallet.staging_v2_catalogue_products and V2 cart orders/lines/reservations. Existing staging_products and single-item checkout remain untouched. Depends on the independent catalogue draft, multi-item draft and integrity-guards draft. Neither this document nor those drafts proves a passing runtime test.

## Atomic checkout — mandatory server transaction
1. Derive buyer from verified auth context; reject unauthenticated callers. Accept only normalized unique V2 product UUIDs, quantities 1..99 (max 50 lines), and a UUID idempotency key; no client prices/sellers/totals.
2. Lock a buyer/idempotency coordination row or use a unique-key safe insert strategy. Same key + same canonical digest returns the prior committed result; same key + different digest fails. Concurrent first attempts must serialize without duplicate debit.
3. Lock the buyer wallet first. The current V2 checkout draft then locks seller rows with `FOR SHARE` in ascending seller UUID order and product rows with `FOR UPDATE` in ascending product UUID order; cancellation locks wallet, order, then product rows in ascending product UUID order. All wallet-writing RPCs must share the wallet locking discipline. Do not hold locks while calling external services. This is a reviewed draft order, not proof of deadlock freedom.
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

## Static lock-order trace — 18 October 2026
Source: current GitHub main V2 checkout/cancel SQL drafts. No PostgreSQL execution or concurrency test.

| Path | Locks acquired before posting | Unresolved competing writer |
| --- | --- | --- |
| V2 checkout | buyer wallet FOR UPDATE → seller rows FOR SHARE (seller UUID ascending) → product rows FOR UPDATE (product UUID ascending) | Seller administration that locks a product before seller can invert the order. |
| V2 cancellation | buyer wallet FOR UPDATE → buyer-owned order FOR UPDATE → product rows FOR UPDATE (product UUID ascending) | Stock administration or other order writer must be inventoried. |
| Allocation void trigger | parent order FOR UPDATE during allocation update | Cancellation already holds order; a privileged direct allocation update may not. |
| Legacy single-item checkout | buyer wallet FOR UPDATE → legacy product FOR UPDATE | Shared wallet contention requires regression testing; V2 and legacy use distinct product tables. |
| Legacy cancellation | buyer wallet FOR UPDATE → legacy order FOR UPDATE → legacy stock update | Same-wallet operations serialize only if all writers lock wallet first. |

### Required corrections before GO
1. Inventory every server-side and privileged seller, product, wallet and allocation writer; record its lock order. No blanket claim of global ordering until this is complete.
2. Forbid product→seller inversion relative to V2 checkout seller→product locks, or redesign all relevant writers under one agreed protocol.
3. Verify cancellation order→product acquisition against inventory administration and reservation transition triggers.
4. Test two buyers with reversed cart ordering, two buyers sharing a seller, cancellation/checkout on the same wallet, and concurrent administrative seller/stock updates. Use bounded lock timeouts and inspect deadlock/rollback results.
5. The hard-stop SQL guards remain in place; the static trace is not a staging test or deployment authorization.

## Repository writer discovery — 18 October 2026
Search scope: GitHub code-search results on Echoes-5 main for `staging_v2_catalogue_products`, `staging_sellers FOR UPDATE`, `ec_wallet.wallets FOR UPDATE`, and `stock_available`. Code search is not an exhaustive audit of every database function or privileged writer.

- V2 catalogue stock mutation: identified in guarded checkout/cancellation DRAFT SQL; no deployed V2 RPC evidenced by this repository search.
- Seller row lock: V2 checkout DRAFT explicitly uses `FOR SHARE`; no matching admin seller `FOR UPDATE` writer was established by the searched results. **Unknown is not absent.**
- Buyer wallet row lock: checkout and cancellation DRAFTs use `FOR UPDATE`; existing legacy checkout/cancel are separately documented to lock wallet first.
- Repository search does not inspect deployed staging functions, SQL-editor scripts, external services, or privileged manual operations. Their lock order remains **UNVERIFIED**.

### Required staging read-only catalogue inventory
Before any staging write, inspect `pg_proc`/ `pg_get_functiondef` for functions mentioning `staging_sellers`, `staging_products`, `staging_v2_catalogue_products`, `wallets` and `ledger`; inspect `pg_trigger` for relevant table triggers, and privileges for privileged writers. Use read-only SELECT queries only, in staging project `ymxpbkviadypsvahrqwt`. Record each writer's actual lock order and ownership; do not infer safety from missing GitHub search hits.

### Decision
NO-GO for V2 posting: external and deployed administrative writers are not yet exhaustively inventoried. No production or staging change is authorized.

## Staging function-body read-only audit — 18 October 2026
Project: `ymxpbkviadypsvahrqwt`. Evidence: SELECT-only inspection of `pg_proc` source/metadata; no SQL changes or test transactions.

| Existing deployed function | Verified lock/write sequence | Residual concern |
| --- | --- | --- |
| `public.ec_staging_checkout` | buyer wallet `FOR UPDATE` → legacy product `FOR UPDATE` → order insert → ledger debit → legacy stock UPDATE → `staging_register_unvalued_payable` (order `FOR UPDATE`) | Seller verified via EXISTS but not locked; concurrent seller verification changes need an eligibility-race test. |
| `public.ec_staging_cancel_order` | buyer wallet `FOR UPDATE` → legacy order `FOR UPDATE` → reversal ledger insert → legacy stock UPDATE → payable void → order cancelled | Product UPDATE takes a write lock; no explicit product `FOR UPDATE` before reversal, but transaction rollback remains atomic. |
| `ec_wallet.staging_register_unvalued_payable` | joins legacy order/product/seller; `FOR UPDATE OF o` on order, then payable INSERT | Re-locks order after checkout acquired product; inspect administrative payable writers for possible inverse lock order. |
| `ec_wallet.require_verified_staging_product` | trigger validates verified seller using EXISTS | No seller row lock in inspected body. |

All four public legacy staging RPCs found in `pg_proc` metadata (`ec_staging_checkout`, `ec_staging_cancel_order`, `ec_staging_catalogue`, `ec_staging_my_orders`) are owned by `postgres` and SECURITY DEFINER. This is a privilege-review requirement, not evidence of an exploit. Additional staging functions and trigger bindings have not been exhaustively audited; seller/stock administrative writers remain unknown.

**Lock design consequence:** V2 checkout's wallet→seller FOR SHARE→V2 product FOR UPDATE path differs from legacy wallet→legacy product FOR UPDATE→order path, though their catalogues are separate. Preserve legacy behavior; do not rewrite it solely to align the V2 draft. Audit seller status updates and privileged writers before V2 activation. **NO-GO remains.**
