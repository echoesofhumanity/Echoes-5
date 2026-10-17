# Echoes Marketplace V2 — Atomic Checkout Contract
Date: 17 October 2026
Status: DESIGN / REVIEW ONLY — NO DATABASE EXECUTION

## Scope and separation
This document specifies a future **synthetic EC staging-only** checkout RPC for multi-product carts. It does not activate purchases, grant table access, modify existing `ec_staging_checkout`, or authorize real money. Existing one-product staging checkout/cancellation remains intact.

## Proposed API contract (not deployed)
`public.ec_staging_cart_checkout_v2(p_lines jsonb, p_idempotency_key uuid)`
Returns `(order_id uuid, total_ec bigint, replayed boolean)`.
- Accept 1–50 distinct product IDs and positive integer quantities 1–99; reject extra fields, duplicate IDs, invalid UUIDs, fractional numbers, nulls and excessive payload sizes.
- Resolve buyer **only** from `auth.uid()`. Ignore any client buyer, seller, stock, price, currency or total.
- Canonicalize sorted product/quantity pairs and hash the normalized cart server-side. A repeat with the same buyer/key/digest returns the original order without new side effects; same key with changed digest fails.
- Reject unverified sellers, inactive/unpublished products, insufficient stock, missing wallet, insufficient EC, and arithmetic overflow.

## Transaction and lock sequence
All steps occur inside a single PostgreSQL function invocation and transaction. Never commit midway or catch and suppress a write failure.
1. Validate authentication, payload bounds and idempotency key; derive normalized cart.
2. Lock the buyer's wallet row (`FOR UPDATE`). This serializes all debits for that wallet only when every debit and credit path follows the same locking protocol; verify all legacy writers first.
3. Look up the buyer/key under this lock. If found, compare request digest and return the original result only on an exact match.
4. Lock every referenced product row in a **stable product-ID order**; never acquire product locks in client-supplied order. All checkout/cancel/reservation writers must use a compatible lock hierarchy. Evaluate seller status and current product fields after locking.
5. Calculate each immutable line price and `quantity * unit_price_ec`, then sum using `numeric` and reject totals outside the positive JavaScript-safe integer range (<= 9007199254740991 EC), even though PostgreSQL stores bigint.
6. Compute current wallet balance from the existing ledger under the wallet lock; reject insufficient funds. Confirm no other wallet writer bypasses the lock discipline.
7. Insert v2 order header, frozen order lines, and reservations. Existing deferred total triggers must validate the final sum.
8. Insert one synthetic EC debit linked to the v2 order with a globally nonconflicting operation/reference and idempotency scheme. **Block this step until ledger operation CHECK and cross-version idempotency namespace are explicitly designed and reviewed.** Do not reuse `checkout_debit` without proving reference and cancellation compatibility.
9. Reduce stock exactly once per product; require expected affected-row counts and nonnegative stock.
10. Insert an append-only `created` event. Final transaction commit validates deferred constraints. Any failure rolls back order, stock, reservations, debit and event.

## Critical unresolved dependencies — implementation blockers
- Current `ec_wallet.ledger.operation` CHECK allows only `topup_settled`, `checkout_debit`, `checkout_reversal`, `refund_credit`, `administrative_correction`. A v2 debit operation needs explicit compatibility design; **do not change this existing CHECK yet**.
- The existing ledger unique key `(wallet_id,idempotency_key)` spans all operations; design a distinct v2 request namespace and a separate cancellation idempotency key before using it.
- Order total and immutable-line triggers must be independently reviewed for concurrency, parent locking and safe exception behavior. Do not assume their draft status means tested correctness.
- Define seller ownership snapshot and verified-seller revalidation; define reservation expiry/release lifecycle and multi-seller payables without payout.
- Define all wallet-writing paths (top-up, adjustment, legacy checkout, v2 checkout and reversal) and verify they lock the wallet consistently; otherwise balance serialization is incomplete.
- Plan a separate v2 cancellation RPC: same buyer authorization, deterministic lock order, one compensating credit, one stock restoration, guarded terminal transitions and concurrent-retry idempotency.
- Existing staging may have trigger constraints on product updates; execute adversarial synthetic regression tests only after a separately approved staging migration.
- The V2 catalogue and order lines now have a composite product/seller FK; still validate seller verification and suspension under locks.
- Reservation release/consumption requires guarded state transitions; expiry alone never authorizes stock return.
- Before implementing debit and reversal, document the exact wallet lock order, operation CHECK extension, cancellation reference uniqueness, payable reversal and ledger reconciliation.

## Minimal test evidence
- Two concurrent buyers for last stock unit: one success maximum.
- Same buyer with two concurrent carts and insufficient combined balance: never negative EC.
- Same idempotency key: same cart returns original; different cart rejected.
- Mixed valid/invalid cart: no order, line, debit, reservation or stock change.
- Duplicate cancellation attempts: no duplicate refund or restock.
- Forced exception after debit: transaction rolls back all writes.
- Two-seller order: frozen seller and price snapshots, accurate obligations.
- Existing one-product EC checkout and wallet RPCs still behave identically.

## Read-only staging verification (17 October 2026)
Supabase table inventory confirms `ec_wallet.wallets`, `ledger`, `staging_sellers`, `staging_products`, `staging_orders` and `staging_seller_payables` with RLS enabled. Seller `verification_status` accepts `pending`, `verified`, `suspended`: only `verified` qualifies. Existing ledger operations are `topup_settled`, `checkout_debit`, `checkout_reversal`, `refund_credit`, `administrative_correction`; no V2 operation exists. The existing payable table references single-item staging orders and must not be reused for multi-seller V2 lines without redesign.

Security advisor flags five authenticated-executable SECURITY DEFINER RPCs (`ec_staging_cancel_order`, `ec_staging_catalogue`, `ec_staging_checkout`, `ec_staging_my_orders`, `ec_wallet_transactions`); these may be intentional APIs, not proof of vulnerability. Audit their ownership checks, search_path and grants before any new V2 RPC. It also flags mutable search_path on `ec_wallet.reject_ledger_mutation` and disabled leaked-password protection. Do not change existing functions or auth settings without separate approval. The RLS-without-policy findings are consistent with a private RPC-only design, but schema exposure/grants still need verification. Reference: https://supabase.com/docs/guides/database/database-linter

**Not verified:** implementation details of existing wallet row locking, ledger unique indexes, RPC bodies, transaction serialization or double-entry balancing. These remain NO-GO blockers, not presumed safe.

## Gate
NO-GO for deploying any v2 checkout until blockers are resolved, an additive migration and rollback plan are reviewed, and synthetic staging tests pass. No production credentials, customer data, money movement or real payouts.
