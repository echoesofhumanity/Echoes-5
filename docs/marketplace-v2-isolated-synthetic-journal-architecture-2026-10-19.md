# Marketplace V2 — isolated synthetic journal architecture
2026-10-19 · DESIGN DECISION FOR REVIEW · NO-GO FOR DEPLOYMENT

## Evidence
Read-only staging inspection confirms `ec_wallet.ledger` has a fixed five-operation CHECK, uniqueness constraints on `(wallet_id,idempotency_key)` and `(wallet_id,operation,reference_id)`, and legacy `public.ec_staging_checkout(p_product_id uuid,p_quantity integer,p_idempotency_key uuid)` exists. No V2 cart tables or RPCs were observed. Existing ledger has a `reject_ledger_mutation` trigger function; its full trigger coverage and privilege behavior require separate inspection.

## Preferred approach: independent, test-only journal and balances
For the first UNSPLIT-TEST-ONLY-v0 multi-item demonstration, create an entirely separate V2 synthetic wallet balance and append-only journal within the independent V2 schema, after separate authorization and review. Do **not** debit `ec_wallet.wallets` / `ec_wallet.ledger` or reuse the existing staging checkout. The EC denomination is illustrative synthetic units, not a claim on real funds, payout, transferable balance or existing account value.

Candidate isolated structures (not yet deployed):
- `ec_wallet.staging_v2_test_wallets`: synthetic buyer identity, integer balance, explicit test-only flag, no FK or sync to legacy wallet ledger.
- `ec_wallet.staging_v2_test_journal`: immutable journal entry, test-wallet ID, V2 order ID, operation `checkout_debit` or `checkout_reversal`, signed integer amount, idempotency key and timestamp. Unique wallet/request and wallet/order/operation constraints.
- `ec_wallet.staging_cart_unsplit_clearing_v2`: one pending unallocated clearing row for each created order; void once on cancel.
- Independent V2 orders, lines, inventory reservations, test-only catalogue and sellers. No seller allocation tables in the selected migration manifest.

## Accounting invariants
- Checkout: journal debit `-total`, synthetic wallet balance decreases by total, clearing pending `+total`; no transfer to seller or other recipients.
- Cancel: reversal `+total`, wallet balance increases by total, clearing becomes voided; no second refund or stock release on replay.
- `balance = opening synthetic balance + SUM(journal deltas)` for each test wallet, enforced or reconciled at transaction boundaries. A clearing row represents an unallocated pending liability, **not** a second spendable wallet.
- No external deposit/top-up, exchange, withdrawal, purchase entitlement or production sync.
- Lock test wallet → seller IDs sorted → product IDs sorted; lock order must be consistent across all V2 writers.
- All order, stock, journal, wallet and clearing changes are one atomic PostgreSQL transaction; errors roll back all effects.

## Comparison
| Criterion | Isolated synthetic journal | Extend existing ledger |
|---|---|---|
| Legacy operation CHECK | Unchanged | Must change |
| Existing checkout coupling | None | High |
| Test wallet isolation | Explicit | Requires special controls |
| Production migration risk | Lower if properly isolated | Higher |
| Future real EC accounting | Requires separately approved bridge | Direct integration possible after full review |
| Current authorization | Design/docs only | Design/docs only |

## Mandatory acceptance gates
1. Verify V2 table definitions, constraints, RLS, grants, trigger ownership and test-only identities.
2. Verify no privileged route can access synthetic journal outside test context.
3. Build guarded review-only DDL/RPC files, retaining first-statement `RAISE EXCEPTION`.
4. Run isolated disposable PostgreSQL concurrency and rollback tests after explicit approval.
5. Prove there is no legacy ledger mutation, seller split, settlement, payout, or entitlement.
6. Obtain separate explicit authorization before any staging migration or write.

**Decision:** Recommend isolated synthetic journal for first V2 test. This document does not authorize installation. Production, staging data and backup unchanged.
