# Marketplace multi-item staging architecture

Date: 17 October 2026. Design only. No migration executed. Existing one-item checkout and cancellation remain unchanged.

## Existing controls confirmed
- Ledger: nonzero signed entries, unique wallet/idempotency and wallet/operation/reference keys, immutable update/delete trigger.
- Orders: buyer/idempotency uniqueness, buyer/product foreign keys, positive quantity and total.
- Products: nonnegative stock, positive price, seller reference, publication status and verified-seller trigger.
- Seller payables: unique order reference, amount allocation check and state guards.
- EC public functions: authenticated access; five privileged functions owned by postgres, wallet snapshot runs in invoker mode.

## Proposed additional staging tables
- cart_orders_v2: buyer, idempotency key, total, status and timestamps.
- cart_order_lines_v2: order, product, seller, quantity and frozen EC price.
- cart_order_events_v2: immutable transition log.
- inventory_reservations_v2: order line, product, quantity, expiry and state.

## Required behavior
- Server calculates every price and total, verifies ownership, seller and publication, and limits quantities.
- Lock the buyer wallet and products in deterministic order to avoid overselling and deadlocks.
- Bind idempotency to the entire normalized cart; changed payload with same key must fail.
- Order creation, inventory reservation, EC debit and event record must commit or roll back together.
- Cancellation reverses stock and EC only once, including concurrent retries.
- No new direct browser table grants, no production payment capability and no real EC issuance.

## Acceptance gates
Test cross-user isolation, repeated checkout, concurrent stock, insufficient funds, overflow, mixed valid/invalid carts, cancellation retry, seller allocation and regression of existing EC staging RPCs. Review RLS and privileged function ownership before any migration.

**Status: DESIGN ONLY — NO-GO for real commerce.**
