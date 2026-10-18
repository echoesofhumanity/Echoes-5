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
