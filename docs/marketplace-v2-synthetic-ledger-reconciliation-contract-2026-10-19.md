# Marketplace V2 — synthetic wallet / journal reconciliation contract
2026-10-19 · REVIEW ONLY · NO-GO

## Scope
UNSPLIT-TEST-ONLY-v0. All balances are synthetic. No writes to legacy `ec_wallet.wallets` or `ec_wallet.ledger`; no production/staging migrations, payouts, entitlements, seller allocations or real EC movements.

## Source of truth
Each test wallet has immutable `opening_ec`, mutable nonnegative `balance_ec`, and immutable append-only journal rows. Each V2 order may generate at most one `checkout_debit` and one `checkout_reversal`.

For every wallet W:
```
expected_balance(W) = opening_ec(W) + SUM(journal.delta_ec WHERE journal.wallet_id=W)
expected_balance(W) = balance_ec(W)
0 <= expected_balance(W) <= 9007199254740991
```
Every debit is negative, every reversal positive; a reversal must reference a previously committed debit of exactly the opposite amount and the same order and wallet. A cancellation cannot reverse an already reversed order.

## Checkout atomic transaction
1. Authenticate trusted synthetic test buyer and request key; validate canonical cart, synthetic catalogue and seller eligibility.
2. Lock test wallet, then affected sellers and products in stable sorted order.
3. Reject insufficient balance, invalid stock, overflow, replay payload mismatch and any pre-existing inconsistent wallet/journal sum.
4. Insert V2 order/lines/reservations; decrement stock; debit wallet once; append one negative journal row; insert one pending unallocated clearing record.
5. Reconcile the locked wallet against the journal and order/clearing totals **before commit**. On any failure roll back every change.

## Cancellation atomic transaction
1. Authenticate buyer and lock wallet/order/stock using a documented consistent lock order.
2. Verify prior debit, non-reversed status, pending clearing, released-state preconditions and original quantities.
3. Restock exactly once; append equal positive reversal once; restore test balance; transition pending clearing to voided once.
4. Reconcile wallet/journal/order/clearing before commit. On any failure roll back all changes.
5. Identical replay returns prior outcome without a second journal entry, credit or restock; conflicting replay fails.

## Required PostgreSQL enforcement before deployment
- A trusted transaction-bound RPC is the sole allowed balance writer; direct UPDATE and journal INSERT denied to application roles.
- Opening balance equality is enforced at INSERT (already in review draft); immutable identity fields cannot be changed.
- An **explicitly reviewed** reconciliation mechanism must prevent commit when balance and journal diverge. Possible approach: controlled SECURITY DEFINER RPC with same-transaction postcondition plus locked wallet; verify there is no alternate writer. Do not assume a PostgreSQL CHECK constraint can contain an aggregate across journal rows.
- No unrestricted TRUNCATE, table-owner bypass, public function EXECUTE, or client-driven buyer ID.
- Concurrency tests: two checkouts racing for last unit; same request replay; two cancels racing; checkout vs cancel; journal insertion failure rollback; overflow and forged identity; malicious direct writes.
- Verify seller/product lock ordering and RLS, SECURITY DEFINER `search_path`, privileges and function ownership.
- Explicit separate approval required for disposable PostgreSQL fixture and any staging writes.

## Current evidence and limitations
GitHub Actions run 39181844462: 15 offline reference tests and 13 static SQL safety checks passed. **No PostgreSQL ACID test has run.** Existing draft is guarded and intentionally incomplete; this document is a contract, not a claim of enforcement.

**Release gate: NO-GO.**
