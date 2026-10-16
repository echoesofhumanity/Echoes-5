# EC staging wallet locking and writer audit
Date: 17 October 2026
Status: READ-ONLY AUDIT. No changes applied.

## Confirmed database functions
- `public.ec_staging_checkout` locks the buyer wallet row `FOR UPDATE` before reading balance or inserting a negative `checkout_debit`. It then locks the product row, validates stock and price, inserts one legacy order and updates stock.
- `public.ec_staging_cancel_order` locks the buyer wallet row before locking the legacy order, inserts a positive `checkout_reversal`, restores stock, voids eligible payables and marks the order cancelled.
- `ec_wallet.my_balance` computes the signed sum of ledger deltas and does not itself lock the wallet; it is a read-only balance snapshot.
- `public.ec_wallet_snapshot` ensures a wallet exists and delegates to `my_balance`; it does not post ledger entries.
- `public.ec_wallet_transactions` reads ledger entries and does not write them.
- The inspected `public` and `ec_wallet` function inventory shows no dedicated public top-up or administrative ledger-posting RPC. This is not proof that privileged external writers do not exist.

## Ledger grants
The inspected `information_schema.role_table_grants` view reports table privileges for `postgres` and `service_role`, including INSERT, UPDATE and DELETE. It did not list direct `anon` or `authenticated` ledger grants. Privileged service code may still write ledger entries outside the wallet lock discipline; this has not been ruled out.

## Concurrency assessment
Legacy checkout and cancellation share a wallet-first locking order. This protects them against each other for the same wallet. A new V2 checkout must acquire wallet locks first and product locks in stable UUID order. Any privileged ledger writer that inserts without locking the wallet can invalidate the assumption that a balance read is serialized. All writer paths must be inventoried before implementation.

## Release blockers
1. Audit privileged service-role jobs, edge functions, scheduled tasks, and direct SQL writers of `ec_wallet.ledger`.
2. Review ledger mutation triggers, constraints and all dependent readers.
3. Define a shared wallet-first lock contract across legacy and V2 paths.
4. Verify rollback, competing checkouts, cancellation races and service-role bypass behavior in synthetic staging tests.
5. Preserve the existing checkout and cancellation functions unchanged during V2 design.

**NO-GO:** Do not deploy V2 checkout or treat this as a complete proof of wallet concurrency safety.
