# Marketplace V2 — Approved temporary unsplit EC test policy (design only)
Date: 2026-10-18
Decision: User approved a temporary synthetic accounting-flow model with NO seller/humanitarian/operating distribution while the final economic policy is undecided.

## Interpretation and limits
- **UNSPLIT-TEST-ONLY v0**: represent the whole gross EC amount as a single unallocated synthetic clearing obligation, associated with the order. No seller entitlement, humanitarian share, operating share, payout, withdrawal or redemption is calculated or promised.
- The buyer-side debit and cancellation reversal are simulated only in a future isolated, approved staging test. All values remain integer EC. Each cancellation reversal must exactly equal the original debit, with idempotent single posting and full rollback.
- This decision **does not approve** a 100/0/0 distribution, even temporarily. Such values would misrepresent the seller share as awarded. It does not approve the example 70/27/3 split or any other percentages.
- The existing seller-allocation DRAFT table requires three non-null components summing to gross; the existing checkout DRAFT requires three approved basis-point values. Therefore UNSPLIT-TEST-ONLY v0 **cannot be deployed using those current schemas/RPCs unchanged**.
- Proposed future design: a separate order-level synthetic clearing record with amount_ec = order.total_ec, state pending/voided, linked to a debit/reversal and marked explicitly test_only and unallocated. It must be isolated from production and any real seller balances. This is a design proposal, not an approved SQL schema.
- Keep all SQL DRAFT fail-closed guards and RPC hard stops intact. Do not populate allocation policy bps with zeros or fabricated values.

## Required pre-execution changes
1. Design and review an isolated clearing-ledger DRAFT and its exact invariants; explicitly exclude seller entitlement and actual settlement.
2. Decide how the existing allocation reconciliation and deferred triggers are excluded or replaced in the **test-only** migration; no disabled constraint without compensating clearing invariant.
3. Ensure legacy single-item checkout, existing staging tables, and production remain unchanged.
4. Prepare a complete staging-only migration, synthetic fixtures, rollback plan and A01–A16 test suite for explicit separate approval.
5. Verify concurrency, auth/RLS, privilege isolation, exact-once cancellation, double-entry/liability accounting boundaries and synthetic journal behavior in PostgreSQL, not merely JavaScript.

## Current verdict
**DESIGN DECISION RECORDED; EXECUTION NO-GO.** No migration, grants, fixture inserts, staging writes, or production actions authorized by this decision alone.

## Consolidated test acceptance criteria
The future isolated staging test must assert one unallocated clearing record per V2 order, with amount equal to order total. A created order requires pending clearing; a cancelled order requires voided clearing. Cancellation must produce exactly one original debit and one equal reversal, one cancellation event, and one stock restoration per reserved line. Repeated cancellation must not post again. Failed transactions must leave no partial records. These criteria are NOT yet PostgreSQL-tested.

Do not install the seller-allocation reconciliation simultaneously with the unsplit test model. The current checkout and cancellation drafts depend on seller allocations and therefore require separately reviewed test-only alternatives; setting distribution percentages to zero is not a valid workaround.

## Checkout/cancel compatibility review — 2026-10-18
GitHub DRAFT inspection confirms that atomic-checkout currently verifies seller allocations on replay and includes an unreachable seller-allocation INSERT after its hard stop. Atomic-cancel verifies seller allocations on replay and preflight, and includes an unreachable allocation void UPDATE after its hard stop. Neither draft can be repurposed as UNSPLIT-TEST-ONLY by simply replacing percentages.

Required isolated test-only adaptation, not yet implemented:
- Checkout: keep buyer wallet and product locks in documented order; create exactly one clearing record for order.total_ec in the same transaction as order, lines, reservations, original debit and created event. Replay must verify the clearing record and full ledger/reservation/event evidence without writing.
- Cancel: lock wallet/order and inventory consistently; verify pending clearing and original debit before posting; release reserved (not consumed) reservations, restore stock exactly once, post one full reversal, void the clearing record and append one cancellation event atomically. Replay must verify voided clearing, exact reversal and no duplicate stock restoration.
- Cross-object deferred checks must cover order/clearing cardinality, amount and status. The separate V2 ledger-event reconciliation remains required; it currently depends on unapproved V2 operation codes.
- Preserve fail-closed guards. Do not activate or silently modify the seller-allocation checkout/cancel variants; instead review separately named synthetic-only RPC candidates with explicit staging approval.
- Test matrix: success, identical replay, changed-cart idempotency conflict, insufficient EC, seller unverified, stock exhaustion, two concurrent buyers for last item, concurrent checkout/cancel, repeated cancel, consumed reservation, rollback on injected error, foreign-wallet ledger, unauthorized role, trigger/grant bypass audit.
- A complete migration/rollback plan, double-entry accounting boundary and PostgreSQL execution evidence are outstanding. Current status: STATIC DESIGN / RUNTIME NO-GO.

## Synthetic-only RPC candidate contracts (separate from existing RPCs)
These are **interface and transaction contracts**, not executable functions. The existing V2 checkout/cancel SQL and all hard stops stay untouched.

**Checkout candidate**: `ec_wallet.staging_cart_checkout_unsplit_test_v2(p_request_key uuid, p_cart jsonb)`. Actor identity must be derived from authenticated server context; never trust a supplied buyer ID. Normalize the cart deterministically; bind request digest to buyer and idempotency key. Acquire buyer wallet lock, then product locks in ascending UUID order, with seller eligibility verified against concurrent state. Confirm EC sufficiency and available stock. In one transaction create order, lines, reservations, original buyer debit, creation event and exactly one unallocated clearing record equal to the order total. No allocation rows or seller entitlements. On replay return the original result only after validating digest and all evidence; reject inconsistent evidence.

**Cancel candidate**: `ec_wallet.staging_cart_cancel_unsplit_test_v2(p_order_id uuid, p_request_key uuid)`. Derive actor and verify ownership; lock buyer wallet, order and product rows in the documented global order. Reject consumed or already expired/released reservations unless an explicitly approved policy covers them. Confirm original debit, one pending clearing record, all lines/reservations and absence of reversal. In one transaction release reservations, restore stock, post one equal and opposite buyer reversal, void clearing and append cancellation event. A replay validates complete evidence without a second refund or stock change. Cancellation and checkout must be tested for concurrency and deadlocks.

**Safety and accounting boundary**: these are future *staging-only synthetic* operations; no real payments, seller allocation, withdrawal, EC distribution, production changes, or automatic settlement. The existing ledger CHECK does not allow proposed V2 operations. No test-only function may be activated until a reviewed ledger-code migration, privileged writer isolation, trigger behavior, authorization and rollback plan exist. A clearing row is not a double-entry liability journal.

**Decision gates before SQL implementation or execution**:
1. Confirm reservation expiry, cancellation and consumption transitions.
2. Define an auditable test-only liability journal or formally limit the test to buyer-side EC movement, with the accounting gap clearly labelled.
3. Verify complete dependency order, privileges, ownership, deferred trigger behavior and concurrency lock protocol.
4. Produce separate fail-closed SQL drafts and deterministic fixtures, then request explicit staging-only write authorization before PostgreSQL tests.

Status: **CONTRACT DOCUMENTED; SQL IMPLEMENTATION NOT YET CREATED; RUNTIME NO-GO**.

## Approved synthetic reservation lifecycle — 2026-10-18
User approved the following five rules for the temporary V2 synthetic demo (design approval only, not permission to run migrations or write staging data):
1. Successful checkout atomically decrements available stock and creates exactly one reserved reservation per immutable order line.
2. Cancellation may release only reservations that have not been consumed, restores each stock quantity once, reverses the full EC debit once, and voids the unallocated clearing record in the same transaction.
3. Reaching `expires_at` is **not** an automatic cancellation, stock release, or EC refund. Expiry is a condition requiring verification of order, reservation, ledger and clearing states before any separately authorized transition. Until an expiry handler is designed, expired-but-reserved records remain unchanged; the cancellation path must reject them rather than guess.
4. A consumed reservation cannot be cancelled through the ordinary cancellation RPC. Any return/refund requires a separately specified and authorized procedure.
5. Checkout/cancel replay must be idempotent; duplicate stock restoration, debit, reversal, or clearing void is forbidden.

### Implementation constraints
- Preserve the existing fail-closed SQL guards and disabled posting paths. This approval does not authorize staging writes.
- The current reservation CHECKs do not enforce one-way transitions; add a guarded transition candidate with immutable order/line/product/quantity/time identity, `reserved -> released` for cancellation only and `reserved -> consumed` only through a future separately authorized consumption operation.
- `released` and `consumed` are terminal in this demo. A release requires `release_reason='order_cancelled'` and a timestamp; `reservation_expired` must **not** be used as an automatic release path.
- Deferred order/reservation/clearing/ledger checks and a global lock-order audit remain mandatory; concurrency and rollback have not been tested.
- No real fulfillment, payout, economic split or production changes are authorized.

Status: RESERVATION POLICY APPROVED / IMPLEMENTATION AND POSTGRESQL TESTS PENDING / RUNTIME NO-GO.

## Final pre-implementation dependency review (2026-10-18)
The reservation transition guard was moved inside the existing review-only SQL transaction in commit 03632cf3698a716565aaddd8caf701c2dbda8888. This is a static correction, not PostgreSQL verification.

**Critical incompatibility to resolve before authoring runnable synthetic checkout/cancel:** the approved policy requires reserved->released on cancellation and no automatic expiry release; the candidate guard currently rejects release at or after expires_at. This is intentionally conservative, but means an expired reserved order has no ordinary cancellation route. A separately reviewed expiry-resolution/refund protocol is required, not an ad hoc override.

**Execution sequence (future, approval gated):** validate independent catalogue and V2 order/line/event/reservation DDL; review reservation guard and unallocated clearing DDL/trigger; review ledger operation code migration and event reconciliation; author isolated synthetic-only checkout/cancel with deterministic lock ordering and rollback; inspect privileged writer and RLS/grants; execute only on expressly authorized staging with deterministic fixtures; record A01–A16 and concurrency results. Seller-allocation DRAFTs must be excluded from the unsplit test migration manifest.

**Current blockers:** (1) no tested PostgreSQL migration, (2) no separate synthetic checkout/cancel implementations, (3) unapproved V2 ledger code migration and journal, (4) incomplete privileged writer/concurrency audit, (5) expired-reservation resolution not specified, (6) no explicit staging-write approval. **RUNTIME NO-GO**.
