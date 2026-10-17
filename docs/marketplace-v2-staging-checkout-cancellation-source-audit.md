# Marketplace / EC — Staging checkout and cancellation source audit

Date: 17 October 2026. Source: read-only pg_get_functiondef and pg_constraint inspection of Supabase project echoes-response-staging. No functions executed and no data changed.

## Existing single-product checkout (verified source)
`public.ec_staging_checkout(uuid,integer,uuid)` is SECURITY DEFINER, search_path empty, owner postgres. It derives buyer from auth.uid(), requires a wallet, quantity 1–100 and non-null idempotency key; locks the buyer wallet, checks an existing order with same buyer/key and rejects a different product or quantity. It locks a published active product with a verified seller, checks stock and bigint multiplication overflow, sums ledger deltas for balance, inserts one order and one negative checkout_debit ledger entry, reduces stock and calls `ec_wallet.staging_register_unvalued_payable`. No V2 multi-item operation exists in this source.

## Existing single-product cancellation (verified source)
`public.ec_staging_cancel_order(uuid)` derives auth.uid(), locks wallet and buyer-owned order, returns the existing cancelled order without new writes if already cancelled; otherwise requires created status and a matching checkout_debit, inserts a positive checkout_reversal, restores stock, voids an unvalued payable and marks order cancelled.

## Verified constraints
- Ledger: nonzero delta, constrained operation taxonomy, unique (wallet_id,idempotency_key) and unique (wallet_id,operation,reference_id).
- Orders: unique (buyer_id,idempotency_key), positive quantity/total, created/cancelled states.
- Products: positive price, nonnegative stock, seller FK, publication values draft/review/published/withdrawn.
- Payables: unique order, seller FK, unvalued/pending_review/approved/void states, conditional allocation sum check.

## Risk analysis and required next evidence
- Wallet-row locking serializes balance changes **through these checkout/cancellation functions for the same wallet**. It does not prove all other ledger writers follow the same lock protocol; inventory races with other writers also need testing.
- A cancelled order returns `refund_ec=total_ec` even when the function performed no new refund. UI must distinguish historical reversal from a new credit.
- Cancellation only voids payables still `unvalued`. Review business rules for orders with payables in `pending_review` or `approved`; do not assume settlement was reversed.
- The 1–100 existing checkout bound differs from V2's proposed 1–99 bound. Preserve legacy behavior and enforce V2 separately.
- A bigint value may be unsafe in browser JavaScript even when SQL multiplication does not overflow; define transport-safe limits.
- Ledger unique keys support replay safety but are not proof of balanced double-entry or ledger immutability. Inspect triggers, all privileged writers and reconciliation independently.
- This source review does not verify effective EXECUTE grants, transaction-level negative tests, trigger behavior, or production readiness.

## Decision
Keep existing single-item staging RPCs unchanged. Build separate, server-owned V2 multi-item RPCs only after verified RLS, grants, triggers, settlement policy and synthetic concurrency tests. **NO-GO** for real commerce, V2 checkout or EC issuance.

References: `docs/marketplace-v2-staging-rls-rpc-boundary-audit.md`, `docs/marketplace-v2-independent-staging-catalog-contract.md`, `docs/marketplace-v2-acceptance-test-matrix.md`.
