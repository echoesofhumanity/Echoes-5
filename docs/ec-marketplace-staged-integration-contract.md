# EC Marketplace — staged integration contract
Date: 2026-10-16
Status: STAGING DESIGN ONLY — no authorization for live payment, real seller payout or EC issuance.

## Verified baseline
- Isolated Supabase project: echoes-response-staging (not production).
- Authenticated wallet snapshot and transaction history; browser never writes ledger.
- Staging catalogue, one-product checkout, order list and cancellation/refund RPCs.
- Synthetic purchase and cancellation visually tested; ledger/order/stock reconciled.
- Concurrency across separate database sessions, multi-user isolation and provider settlement are **not** yet acceptance-tested.
- Current 1,000 EC test credit is synthetic; remove via approved compensating entry at test close, not by deleting immutable ledger rows.

## Separation of concerns
1. **Catalogue**: verified seller, product owner, publication status, authoritative EC price, stock and fulfillment classification. A synthetic staging product is not a published Marketplace listing.
2. **Customer order**: server-generated order ID, immutable checkout price snapshot, quantity, lifecycle, authenticated buyer and unique idempotency key. Production order state must extend beyond staging created/cancelled.
3. **EC ledger**: customer wallet is the only source of EC balance. Provider settlement alone may create paid EC; browser cannot mint or modify entries. Refunds use distinct immutable reversal entries.
4. **Seller earnings**: separate fiat-denominated payable accounting tied to settled orders, refunds, platform fees and payout status. A customer EC debit does **not** itself prove a seller is owed fiat.
5. **Humanitarian allocation**: separate, auditable allocation of eligible net proceeds; never confuse gross EC sales with distributable cash. Governance/board compensation, operating cost ceilings and distributions require formally adopted rules and legal/tax review.
6. **Provider integration**: payment events, merchant of record, provider webhooks, chargebacks, reconciliation and payouts remain disabled until contractual, legal and security gates are complete.

## Interface boundaries
- Browser sends only product identifiers, quantity and unique request ID; backend resolves identity and prices.
- Staging RPCs must not be linked as live checkout or exposed to production customer flows.
- Authenticated order-history and cancellation are owner-scoped.
- Ledger writes must be backend-only; SQL functions with SECURITY DEFINER require role restrictions and dedicated privilege/security review.
- An order's stock reservation, EC debit and status transition must be atomic and idempotent.
- Cancellation after fulfillment requires a distinct returns/refund policy; staging cancellation is only for unfulfilled test orders.

## Rollout gates
A. Catalogue/seller identity and product publication model approved.
B. Real concurrent-request and multi-user tests; balance and inventory invariants.
C. Test-mode payment provider signature verification, replay and failure/chargeback handling.
D. Seller payable and humanitarian allocation double-entry reconciliation with sample scenarios.
E. Audit logs, abuse prevention, monitoring, privacy, accessibility and localization tests.
F. Formal legal/merchant approval and staged production deployment with rollback.

**Until all gates pass:** only isolated synthetic checkout. Production buttons stay disabled.
