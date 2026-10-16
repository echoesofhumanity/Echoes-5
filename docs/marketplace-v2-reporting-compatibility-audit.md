# Marketplace V2 — Read-only reporting compatibility audit
Date: 17 October 2026
Scope: EC staging schema, read-only function definition inspection. No migrations, writes or real payments.

## Confirmed dependencies

1. `ec_wallet.staging_reconciliation()` examines the legacy `ec_wallet.staging_orders` table and expects exactly one matching `checkout_debit` for each order and exactly one `checkout_reversal` when cancelled. It also checks all wallet balances and product stock for negative values. Its snapshot reports aggregate ledger balance and legacy order counts.
2. `ec_wallet.staging_payables_summary()` aggregates the legacy `staging_seller_payables` table by state. It does not report V2 multi-seller obligations.
3. `ec_wallet.staging_cost_distribution_report()` joins cost scenarios to legacy `staging_orders`. It cannot directly report V2 orders.
4. `ec_wallet.staging_distribution_audit_report()` reports review events from existing distribution evidence and review-log tables. The audited function does not implement V2 seller review history.
5. `public.ec_wallet_transactions()` lists the authenticated user's ledger entries without filtering by operation label; newly allowed V2 labels would appear in the transaction history unless the UI is explicitly adapted.
6. `public.ec_wallet_snapshot()` delegates to wallet-balance functions; any future signed V2 ledger entry would affect wallet balance by design.

## Compatibility decision

- Keep legacy reports and RPCs unchanged.
- Add a separate V2 reconciliation function after the V2 debit/reversal contract is approved.
- V2 reconciliation must check exactly one debit per created/cancelled V2 order, exactly one reversal only when cancelled, matching absolute amounts, line totals, seller obligation totals, inventory reservation transitions and nonnegative wallet balances.
- Distinguish legacy and V2 operation labels in transaction-history presentation; never silently hide V2 transactions.
- Maintain separate synthetic V2 seller obligations; no real payout or fiat allocation.
- Any future combined dashboard must aggregate both models explicitly and label each source to avoid counting an order twice.

## Additional audit observation

The existing reconciliation's `reconciliation_snapshot` row is an informational snapshot with `passed=true`; it is not a stand-alone proof that all accounting invariants hold. Its `order_ledger_consistency` check currently targets legacy orders only. A V2 deployment must not be approved based solely on this report.

## Required next checks

Review all other wallet-writing functions and triggers, transaction history UI label handling, unique ledger reference/idempotency interactions, and synthetic tests for old and new reconciliation side by side.

**Release decision: NO-GO.** This audit does not activate V2, change ledger constraints or modify staging/production.
