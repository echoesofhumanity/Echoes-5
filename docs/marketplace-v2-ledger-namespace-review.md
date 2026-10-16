# Marketplace V2 transaction namespace review

Date: 17 October 2026. Documentation only. Nothing in this file is an approved migration.

## Existing ledger facts

The staging ledger accepts the operation labels topup_settled, checkout_debit, checkout_reversal, refund_credit and administrative_correction. It enforces unique wallet/idempotency and wallet/operation/reference combinations. Existing single-item checkout and cancellation depend on checkout_debit and checkout_reversal.

## Proposed V2 separation

V2 order requests retain their external idempotency UUID in the V2 order header alongside a digest of the normalized cart. Each ledger entry receives a separate internal UUID for its idempotency field. The order UUID becomes the ledger reference. Distinct labels, provisionally cart_checkout_debit_v2 and cart_checkout_reversal_v2, would identify V2 entries without conflating them with legacy checkout.

The two proposed labels are NOT permitted by the current ledger CHECK. A future, separately approved migration must update that constraint before any V2 ledger write can work. Do not bypass the CHECK or repurpose existing legacy records.

## Invariants

A wallet, operation and V2 order reference can appear at most once. A repeat checkout with the same buyer, key and canonical cart must return the existing order without another debit. A changed cart with the same key must fail. Cancellation may create at most one compensating credit per order and must restore inventory only once. Buyer ownership, sufficient balance, available stock and seller verification are checked within one transaction.

Every wallet-writing path must follow a consistent locking protocol. Verify the current top-up and adjustment paths before claiming concurrency safety. V2 seller obligations are separate from legacy single-seller payables; no payout is authorized.

## Required review before implementation

1. Inventory all ledger readers and writers, including triggers and reports.
2. Verify the effect of new operation labels on history, reconciliation and monitoring.
3. Design multi-seller obligation records and cancellation transitions.
4. Specify the exact constraint migration and rollback with separate authorization.
5. Test synthetic concurrency, idempotency, refund and legacy regression.

**Release decision: NO-GO.** This document does not authorize database writes, live checkout, EC funding or real payment.
