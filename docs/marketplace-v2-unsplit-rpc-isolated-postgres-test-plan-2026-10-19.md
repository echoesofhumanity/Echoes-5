# Marketplace V2 — isolated PostgreSQL RPC acceptance plan
2026-10-19 | UNSPLIT-TEST-ONLY-v0 | REVIEW ONLY / NO-GO

## Boundary
This is a test plan, not an executable migration. Use a disposable local PostgreSQL database, not Supabase production or staging, after separate approval. All data must be synthetic. No real EC ledger, existing checkout, payment provider, seller allocation, payout, or entitlement.

## Proposed RPC boundary (not deployed)
- checkout(request_key UUID, canonical_cart JSONB), deriving buyer from trusted synthetic test context.
- cancel(order_id UUID, request_key UUID), deriving buyer from trusted synthetic test context.
- No caller-provided buyer_id, wallet_id, amount, unit price, seller split or stock override.
- Use explicit schema-qualified objects, fixed search_path, narrow function EXECUTE grants, no direct table write grants.
- Each call must be one PostgreSQL transaction; do not commit inside PL/pgSQL.

## Required migration dependency graph
1. Separate V2 synthetic sellers and catalogue; fixed integer unit prices and stock constraints.
2. Separate V2 orders, lines and reservations with uniqueness and FKs.
3. Separate V2 test wallets, immutable journal, and pending/voided clearing.
4. Trusted transaction-bound RPCs; grants, RLS and triggers.
5. Deferred or same-transaction reconciliation, tested against alternate writers.
6. Disposable synthetic fixture and negative tests.

Never apply allocation-based legacy checkout/cancel drafts to the UNSPLIT schema. Preserve first-statement RAISE EXCEPTION in every review SQL file.

## Test matrix (each case must assert database state, not just RPC response)
| Case | Expected result |
|---|---|
| One valid cart (2 products, 2 sellers) | One order, one debit, one pending clearing, correct stock and wallet |
| Identical checkout replay | Same order; no second debit, reservation or stock change |
| Conflicting request-key replay | Reject; no mutation |
| Insufficient balance | Reject; no mutation |
| One item out of stock | Reject whole cart; no partial reservation |
| Concurrent last-unit purchases | Exactly one success, no negative stock |
| Concurrent same-key purchases | One effect only; identical response |
| Valid cancellation | Restock once, one positive reversal, clearing voided |
| Repeated cancellation | No extra credit, journal or restock |
| Two simultaneous cancellations | Exactly one reversal and stock restoration |
| Cancel another buyer's order | Reject without revealing protected details |
| Journal INSERT error during checkout | All wallet, stock, order and clearing writes rolled back |
| Clearing transition error during cancellation | All credit, journal and restock writes rolled back |
| Forged buyer, seller, price or amount | Reject; trusted server-side values only |
| Integer overflow, zero or negative qty | Reject before writes |
| Direct client UPDATE/DELETE/TRUNCATE | Denied |
| Direct client journal INSERT | Denied |
| Concurrent checkout/cancel on same wallet | Serializable invariants; no deadlock from inconsistent lock order |
| Legacy checkout still present | Legacy function and ledger unchanged |
| Full reconciliation after all tests | opening + SUM(deltas) = balance; clearing one/order; no seller allocation |

## Required evidence
Capture transaction isolation level, database version, SQLSTATE for expected failures, final per-table counts, journal/order/clearing reconciliation queries, RLS and GRANT inspection, concurrency traces, and rollback proofs. No user identifiers or credentials in CI artifacts.

## Current state
15/15 offline Node synthetic tests and 13/13 static review checks passed in GitHub Actions run 39181844462. No database test has yet run; all SQL drafts remain blocked. **NO-GO for staging deployment.**
