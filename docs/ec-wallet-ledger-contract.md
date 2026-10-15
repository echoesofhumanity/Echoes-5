# Echoes EC Wallet — authenticated ledger contract (development)
Date: 2026-10-15
Status: specification only; NOT a live wallet, payment integration or production approval.

## Authority and trust boundary
The GitHub Pages frontend must never issue EC, decide balances, settle fiat payments or choose seller payouts. Only an authenticated backend with restricted database privileges may mutate a server-side, append-only ledger. The wallet preview remains explicitly disabled until the backend is deployed and verified.

## Accounts and actors
- customer_id: verified authentication subject, never supplied as an authority by the browser.
- seller_id: verified seller account; separate from customer and administrative roles.
- payment_event_id: unique verified provider settlement identifier.
- order_id: unique backend-generated purchase identifier.
- idempotency_key: unique per authenticated actor and operation; replays must return the original result, never create another debit or credit.

## Immutable EC ledger
- ledger_entry_id: server-generated UUID; recorded_at: server timestamp.
- wallet_id: backend-resolved wallet identity.
- delta_ec: signed nonzero integer, bounded and checked for overflow.
- operation: topup_settled | checkout_debit | checkout_reversal | refund_credit | administrative_correction.
- reference_type/reference_id and idempotency key, each constrained by operation.
- Never UPDATE or DELETE posted ledger entries; corrections are compensating entries with audited approval.
- Balance = SUM(delta_ec) of committed entries for the authenticated wallet, in a database transaction. Never trust localStorage or client-supplied totals.

## Top-up lifecycle
initiated → provider_pending → settled | failed; settled → reversed only via audited compensating entry.
- Only verified provider webhooks, checked server-side for authenticity and amount/currency/merchant, can mint EC.
- Persist and deduplicate provider events. Reject client-created settlement claims.
- Explicitly define exchange rate, tax, refund and chargeback treatment before any real payment.

## Checkout lifecycle
- Backend verifies published seller/product, authoritative EC price, stock and permitted customer.
- Lock wallet/inventory; atomically check available balance, reserve stock, debit EC and create order.
- Concurrent requests cannot overspend; retries cannot duplicate orders or stock reservations.
- Cancel/refund uses a separate idempotent compensating ledger entry; preserve original entries.
- Seller fiat settlement is a separate regulated/payment-provider flow. EC itself cannot be withdrawn or transferred externally.

## Read API (future)
GET /wallet: authenticated balance_ec and server-generated as_of timestamp; no account id from query params.
GET /wallet/transactions: authenticated paginated entries with server-side filtering and no other users' data.
POST /wallet/topups: provider-hosted session initiation only, with CSRF and abuse controls.
POST /checkout: authenticated cart identifiers/quantities and idempotency key; backend re-prices everything.

## Release gates
1. Auth, RLS and backend-only write privileges validated; anonymous access cannot read or write wallets.
2. Database concurrency and idempotency tests for top-ups, checkout, refund and chargebacks.
3. Provider webhook signature, replay protection, reconciliation and seller fiat payout tests.
4. Monitoring, audit trail, data retention, privacy, dispute support and legal review.
5. UI may show live balances or enable buttons only after all gates pass.

Do not modify production Supabase schemas, backup repositories, Admin V3, radio/TV or the running synthetic Marketplace in this specification step.
