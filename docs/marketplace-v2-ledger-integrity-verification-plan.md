# Marketplace V2 — Ledger integrity inspection plan
Date: 17 October 2026
Status: Pending database verification. No schema modifications.

## Verified so far
- Legacy checkout and cancellation lock the wallet row before ledger writes.
- The ledger uses signed EC deltas and has unique wallet/idempotency and wallet/operation/reference constraints according to earlier staging audits.
- A ledger mutation-rejection trigger was reported in earlier audits; its current catalog definition has not been independently rechecked in this step.
- The service_role has ledger table privileges. Privileged jobs and external callers remain unverified.

## Required read-only catalog checks
1. Inspect pg_constraint and pg_indexes for ledger primary key, CHECK rules, foreign keys and uniqueness.
2. Inspect pg_trigger and pg_get_triggerdef for enabled state and mutation guards.
3. Inspect pg_proc definitions and ownership for trigger functions and ledger-writing RPCs.
4. Inspect role grants, schema USAGE and RLS settings; verify whether service-role paths bypass RLS.
5. Search application repository and deployed edge-function configuration for ledger insert/update/delete paths.
6. Inspect scheduled jobs and external integrations separately; database function inventory alone is insufficient.

## Design decision
Do not alter existing ledger CHECK constraints or legacy checkout RPCs. Proposed V2 operation names remain unapproved. Require wallet-first locking for every debit/credit path, deterministic product locks, append-only records, unique operation/reference pairs, and one transaction per checkout/cancellation.

## Acceptance
The next implementation gate requires actual catalog evidence for each constraint and trigger, identified privileged writers, and synthetic concurrent tests. Unverified items must remain open.

**NO-GO:** No V2 ledger write, checkout activation, or production migration is authorized.
