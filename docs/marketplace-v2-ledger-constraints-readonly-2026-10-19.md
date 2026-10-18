# Marketplace V2 — ledger constraint verification (staging READ ONLY)
Date: 2026-10-19. NO-GO; no database mutations.

Read-only pg_constraint metadata query on staging project `ymxpbkviadypsvahrqwt` confirmed:

- `ec_wallet.ledger`: PK `entry_id`; FK `wallet_id` → `ec_wallet.wallets(wallet_id)` ON DELETE RESTRICT.
- `ledger_delta_ec_check`: `delta_ec <> 0`.
- `ledger_operation_check`: permitted operations **only** `topup_settled`, `checkout_debit`, `checkout_reversal`, `refund_credit`, `administrative_correction`.
- Unique `(wallet_id,idempotency_key)`.
- Unique `(wallet_id,operation,reference_id)`.
- `ec_wallet.wallets`: PK `wallet_id`, unique `owner_id`, FK `owner_id` → `auth.users(id)` ON DELETE RESTRICT.

## Blocking discrepancy
The review-only V2 checkout/cancel drafts use `cart_checkout_debit_v2` and `cart_checkout_reversal_v2`; these **cannot** pass the currently installed `ledger_operation_check`. No change to that check is authorized. Do not disguise V2 events as legacy operation codes or bypass the constraint.

## Design decision still required
Choose a separately reviewed, versioned ledger extension or isolated V2 synthetic journal after confirming all legacy ledger writers and their locking behavior. Ensure exactly one debit and one reversal per order, unique request keys, no buyer-to-seller settlement and no unapproved economic split.

## Remaining gates
1. Inventory, order and clearing V2 schema not installed in staging.
2. Verify RLS, triggers, indexes and writer lock order with further **read-only** inspection.
3. Create independent, guarded UNSPLIT test-only schema and RPC review artifacts, not active migrations.
4. Run tests on a disposable PostgreSQL fixture with explicit approval; staging writes remain forbidden.
5. Keep GitHub Actions offline reference and static review checks passing.

Production, staging data and backup repository unchanged.
