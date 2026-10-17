# Marketplace V2 — Ledger Write Isolation Architecture
Date: 17 October 2026
Status: REVIEW ONLY — no grants changed, no SQL executed, no V2 RPC deployed.

## Verified current staging evidence
- public.ec_staging_checkout and public.ec_staging_cancel_order are SECURITY DEFINER owned by postgres, set search_path to empty, and lock the buyer wallet row FOR UPDATE before ledger INSERT.
- ec_wallet.reject_ledger_mutation is SECURITY INVOKER owned by postgres with no function-level search_path; it is used by a BEFORE UPDATE OR DELETE trigger on ledger.
- postgres and service_role currently hold INSERT/UPDATE/DELETE table grants on ledger, wallets, staging_orders and staging_products. RLS is enabled but service_role may bypass it. Existing ledger uniqueness: (wallet_id,idempotency_key) and (wallet_id,operation,reference_id).
- No evidence yet establishes that all external service_role clients avoid direct ledger INSERT.

## Decision: incremental, legacy-safe isolation
Do not revoke service_role privileges from existing tables or change existing SECURITY DEFINER functions as part of initial V2 schema deployment: this could break existing services. V2 gets isolated catalogue/orders/reservations, no client table grants and no purchase RPC until controls are reviewed.

Preferred target is a narrow, audited server-owned posting boundary for V2 with the following characteristics:
1. An authenticated buyer calls only a reviewed V2 checkout/cancel RPC. Buyer identity comes from auth.uid(), never a caller-supplied owner ID. Grant EXECUTE only to intended roles; revoke PUBLIC defaults and audit every SECURITY DEFINER function's owner and fixed search_path.
2. Lock wallet row FOR UPDATE first, resolve idempotency under lock, lock order if cancelling, then product rows sorted by UUID. Every debit/reversal writer must follow the wallet protocol.
3. Validate seller/product status, amount, reservation state and existing ledger references under locks. Only reviewed function writes a V2 debit/reversal, guarded by existing uniqueness indexes and dedicated operation codes.
4. Keep V2 order, stock, reservation, event, ledger and synthetic seller-allocation records in one transaction. Any failure rolls back all writes.
5. Never trust a service_role key in a browser, public repo, edge bundle or client. Inventory all current service_role usage and credential scopes separately. Treat unrestricted direct SQL with service_role as an unresolved control gap.
6. Do not assume RLS or an UPDATE/DELETE immutability trigger enforces INSERT discipline. Evaluate dedicated restricted writer role, explicit GRANT/REVOKE, and database-side INSERT validation in a separately approved migration; evaluate impacts on legacy checkout first.
7. Separate transaction authorization from accounting correctness: ledger is wallet deltas, not proven double-entry; V2 seller liabilities and reversals need their own reconciled, synthetic-only journal.

## Explicitly rejected shortcuts
- Changing existing ledger operation CHECK or table grants before reviewing legacy compatibility.
- Reusing legacy single-item staging_products or staging_seller_payables for V2 order lines.
- Creating SECURITY DEFINER V2 functions with default EXECUTE PUBLIC or mutable search_path.
- Assuming a trigger on UPDATE/DELETE blocks unauthorized INSERT.
- Trusting client prices, seller IDs, totals, wallet IDs or direct client writes.
- Introducing real payments, fiat conversion, payout or production credentials.

## Approval sequence
A. Complete read-only audit of service_role usage, function EXECUTE grants, ledger INSERT paths, and relevant trigger bodies.
B. Choose a migration approach for V2 operation CHECK and writer isolation, with legacy rollback strategy.
C. Review V2 synthetic accounting and cancellation idempotency; add tests for simultaneous checkout, retry, last unit, service-role bypass and rollback.
D. Approve and execute on staging only in a separate explicit step; verify old single-item RPCs.
E. Keep production NO-GO until independent security, legal, financial and operational gates pass.
