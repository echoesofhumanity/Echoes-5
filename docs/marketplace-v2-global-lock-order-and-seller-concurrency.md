# Echoes Marketplace V2 — Global Lock Order & Seller Concurrency
18 October 2026 — REVIEW ONLY. No database changes or deployment.

## Verified draft issue
The current atomic-checkout draft acquires wallet -> product A -> seller A -> product B -> seller B. FOR SHARE protects each seller row from concurrent status UPDATE once acquired, but interleaving product and seller locks may deadlock with other product/seller writers. It is deliberately blocked from posting.

## Target lock hierarchy (all cooperating V2 writers)
1. Normalize and validate cart before taking locks; derive buyer only from auth.uid().
2. Acquire wallet row FOR UPDATE. For cancellation, acquire order row FOR UPDATE after wallet.
3. Determine the complete set of candidate seller IDs from product catalogue in a NON-authoritative preliminary read. The preliminary read is only for lock-set discovery, never final eligibility.
4. Acquire ALL seller rows in ascending seller_id UUID order, one by one, using FOR SHARE. This freezes verification_status during transaction. Missing seller -> abort.
5. Acquire ALL product rows in ascending product_id UUID order, one by one, using FOR UPDATE. Revalidate each product's seller_id against the prelocked seller set and every price/publication/review/stock field. If a seller association differs, ABORT AND RETRY WHOLE TRANSACTION; never acquire a newly discovered lower-order seller lock mid-flight.
6. Read ledger balance while wallet lock held; calculate amounts from locked product rows.
7. Atomic order/line/reservation/stock/debit/payable/event writes only after all validations and other blockers cleared.

This is a candidate protocol, NOT proof of global deadlock freedom: legacy checkout, admin seller edits, catalogue updates, inventory restocks and cancellations must be inspected and coordinated. Admin writers must never lock product first and then attempt seller row locks in reverse order.

## Seller suspension behavior
- If checkout locks seller FOR SHARE first, suspension UPDATE waits; checkout may commit under prior verified state. The business rule must define whether that is acceptable.
- If suspension commits first, checkout sees suspended and rejects.
- A seller suspension requiring immediate revocation of pending carts needs a separate policy; no retroactive cancellation is implied.

## Cancellation nuance
Cancellation requires wallet -> order -> seller rows (only if required by policy) -> product rows, with the same ascending lock hierarchy. Do not automatically restore consumed or expired reservations. Order header and reservation transitions alone do not guarantee a refund or correct stock.

## Tests before approval
C01: checkout A+B vs B+A with shared sellers; no deadlock and same lock ordering.
C02: seller suspension racing checkout; deterministic serialized result and audit evidence.
C03: seller reassignment racing checkout; abort/retry and no wrong seller snapshot.
C04: inventory restock racing final-unit purchase; no negative stock.
C05: checkout vs cancellation vs legacy single-item checkout; no lock inversion.
C06: lock_timeout/statement_timeout; transaction rollback and retry semantics.
C07: malicious client product ordering and duplicate product IDs cannot change lock order.
C08: multi-seller stock and EC accounting reconciles under concurrent requests.

## Remaining NO-GO blockers
- Implement the candidate hierarchy in the SQL checkout draft; current draft interleaves locks and remains disabled.
- Audit every existing product/seller/ledger writer, including privileged service_role direct SQL.
- Implement and review synthetic seller allocations, EC debit and cancellation RPCs.
- Stage approved migrations and run the concurrency tests. None has been executed.
