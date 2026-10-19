# Marketplace V2 — isolated order, inventory and clearing schema contract
2026-10-19 · UNSPLIT-TEST-ONLY-v0 · REVIEW ONLY · NO-GO

## Boundary
All entities are independent synthetic V2 fixtures. No FK to legacy staging products, sellers, wallet, ledger or auth.users. No real purchase entitlement, shipping, payment, payout, seller allocation or real EC. Staging and production are not migration targets under this authorization.

## Dependency order and required keys
1. **staging_v2_test_sellers**: seller_id UUID PK; fixture_name text; active boolean; test_only true enforced. No payout destination.
2. **staging_v2_test_products**: product_id UUID PK; seller_id FK to V2 test sellers RESTRICT; unit_price_ec bigint >0 and <= JS safe integer; available_qty integer >=0; active boolean; test_only true; immutable seller/price for an already reserved order (order lines snapshot prices).
3. **staging_v2_test_wallets**: wallet_id UUID PK; fixture_buyer_id UUID UNIQUE; opening_ec/balance_ec nonnegative safe integers; test_only true. Existing guarded review draft covers part of this.
4. **staging_cart_orders_v2**: order_id UUID PK; wallet_id FK to V2 test wallets; buyer fixture ID stored only if verified by trusted RPC; checkout_request_key UUID UNIQUE per buyer/test wallet; canonical_cart_hash and canonical_cart JSONB; total_ec bigint positive safe integer; status created/cancelled; created_at/cancelled_at; cancellation request key unique per wallet; expiry is explicit and must not be guessed.
5. **staging_cart_order_lines_v2**: line_id UUID PK; order_id FK RESTRICT; product_id FK RESTRICT; seller_id FK RESTRICT; quantity 1..99; unit_price_ec positive; line_total_ec positive; UNIQUE(order_id,product_id); immutable order snapshot.
6. **staging_inventory_reservations_v2**: reservation_id UUID PK; order_id and product_id FK RESTRICT; reserved_qty 1..99; state reserved/released; UNIQUE(order_id,product_id); release once.
7. **staging_cart_unsplit_clearing_v2**: clearing_id UUID PK; order_id UNIQUE FK RESTRICT; amount_ec positive; state pending/voided; voided_at; no recipient, allocation or transfer columns. One clearing record per order.
8. **staging_v2_test_journal**: immutable signed debit/reversal per wallet/order, with unique request and operation constraints, as separately drafted.

## Cross-table constraints (must be enforced by reviewed trusted RPC and transaction checks)
- Cart 1..50 distinct products; each quantity 1..99; canonical order independent of client line ordering; reject duplicates and unexpected keys.
- Each line seller matches the product seller at checkout; line price is a snapshot of trusted catalogue unit price, never a client-supplied amount.
- Order total = SUM(line totals) = ABS(single checkout journal debit) = clearing amount; check integer overflow before writes.
- For each created order: exactly one pending clearing and one debit; for each cancelled order: exactly one voided clearing, one debit, one equal reversal, and released reservations.
- Wallet balance = immutable opening balance + SUM(journal deltas), within safe integer range.
- No negative stock, no orphan reservations, no duplicated journal rows or cancelled order reactivation.
- Checkout and cancellation use consistent lock order; a unique request key with mismatched cart must fail closed.
- Prevent direct client writes; RLS FORCE, restricted grants, safe SECURITY DEFINER owner/search_path, and immutable audit trail; enforce against TRUNCATE and alternate writers.

## Unresolved before executable SQL
- Existing draft `marketplace-staging-v2-unsplit-clearing.DRAFT.sql` is tied to legacy V2 seller allocation/order drafts and must not be used as the migration source for isolated UNSPLIT without review.
- Existing `marketplace-v2-isolated-synthetic-wallet-journal.REVIEW.sql` references `staging_cart_orders_v2`, so install order must place V2 orders first; wallet FK on orders requires wallets first. Resolve by creating wallets, orders, then journal.
- Review separate creation of catalogue/sellers, wallet, orders/lines, reservations, clearing, journal; avoid circular FKs.
- Confirm auth context, cancellation expiry, idempotency-key scope, price mutation semantics, reconciliation enforcement, lock ordering, and privileges.
- Disposable PostgreSQL test plan is documented separately; no DB tests have been run.

## Next gate
Produce non-executable, first-statement-blocked DDL review draft for isolated V2 seller/product/order/line/reservation/clearing entities, and extend static CI checks. No staging writes authorized.

**NO-GO.**
