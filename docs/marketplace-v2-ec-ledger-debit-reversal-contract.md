# Echoes Marketplace V2 — Synthetic EC Debit/Reversal Contract
Date: 17 October 2026
Status: DESIGN / REVIEW ONLY. DO NOT EXECUTE OR ENABLE RPCs.

## Evidence and scope
Read-only staging pg_proc inspection of functions in public and ec_wallet found direct INSERT INTO ec_wallet.ledger in public.ec_staging_checkout and public.ec_staging_cancel_order. Both lock the buyer wallet row FOR UPDATE before ledger mutations. This inventory does NOT rule out privileged direct SQL, triggers, external writers or other schemas. Existing ledger unique indexes: (wallet_id,idempotency_key), (wallet_id,operation,reference_id). Ledger operation CHECK currently excludes V2 names. No V2 migration has been executed.

## Proposed namespace (requires explicit migration approval)
- Synthetic debit operation: cart_checkout_debit_v2; reference_id = V2 order_id; idempotency_key = checkout request UUID. Unique buyer/key at V2 order header plus wallet/key in ledger.
- Synthetic reversal operation: cart_checkout_reversal_v2; reference_id = SAME V2 order_id; idempotency_key = a separate, server-derived or server-persisted reversal UUID, never the checkout key. One reversal per wallet/operation/order guaranteed by existing unique index.
- Do NOT use existing checkout_debit/checkout_reversal operation names as an undocumented shortcut. The operation CHECK extension needs additive migration review and legacy regression.
- Idempotency keys are wallet-global across operation types. A new V2 request must reject a key already used by another operation or order; same key + same digest may replay only its matching V2 order.

## Global lock order and atomic posting
1. Authenticated buyer and normalized V2 cart; no client-supplied EC amounts.
2. Acquire buyer wallet row FOR UPDATE. All wallet writers must obey this lock before reading ledger balance or inserting a ledger entry.
3. Resolve idempotency replay under wallet lock. On exact replay, return prior order without any write.
4. Acquire V2 order row if cancelling; acquire product rows in ascending UUID order. Ensure other stock writers follow the same order; seller status rechecked under appropriate locks.
5. Guard stock updates; write V2 order, immutable lines, reservations, ledger debit and event in one transaction. Debit delta = -total_ec, reversal delta = +original total_ec. Abort on any mismatch.
6. Cancellation must verify original debit and absence of existing reversal, lock the order, guard state transitions, restore stock exactly once for reserved (not consumed) lines, and post one reversal. Repeated calls return existing cancellation result.
7. Never swallow write errors or commit partial effects. No network calls while locks held.

## Accounting boundaries
The existing ledger is a wallet-delta journal, not demonstrated balanced double-entry accounting. V2 must not represent an EC debit as a fiat charge or seller payout. A separate reviewed multi-seller synthetic payable/allocation journal must balance line allocations to the order total, support reversal/void and have no cash-out semantics. Legacy staging_seller_payables references single-item orders; do not reuse its order FK for V2.

## Blocking validations
- Inspect database grants, triggers, every privileged or external ledger writer, and exact function definitions before approving deployment.
- Review ledger CHECK alteration, global idempotency collisions, event/reversal uniqueness and ledger append-only protections.
- Test parallel checkouts and cancellations, failure after debit, stale price, seller suspension, missing original debit, insufficient balance and last-stock races.
- Prove wallet balance reconciliation and V2 synthetic payable reconciliation; verify legacy single-item RPC regressions.
- Approve migration/rollback separately. No production database changes or real payments.
