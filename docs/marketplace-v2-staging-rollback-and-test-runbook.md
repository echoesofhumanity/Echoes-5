# Marketplace V2 — Staging Rollback & Test Runbook
Date: 18 October 2026
Status: REVIEW ONLY. No permission to execute migrations, seed data or destructive rollback.

## Hard prerequisites
- Written approval specifying staging project ymxpbkviadypsvahrqwt, exact commit SHA, checksum, SQL order and operator.
- Independent backup/restore point and documented recovery window; production project nlawhidxubnmoxtcxbiq is OUT OF SCOPE.
- Existing legacy RPCs and schema inventory, trigger/function/ACL baseline, synthetic identities, and no real buyer/seller data.
- All V2 migrations reviewed, deduplicated, and guarded draft files converted into independently approved executable migrations.
- Approved V2 checkout/cancel RPCs, ledger operation CHECK, synthetic payable journal, privileged writer isolation, and test harness; these do not yet exist as operational V2.
- Do not deploy a partial schema with callable checkout or grant direct client table access.

## Dependency order and checkpoints
P0: Baseline read-only inventory and recovery snapshot. Verify old single-item checkout/cancel behavior.
P1: Independent V2 catalogue; check RLS and zero client table grants.
P2: V2 order/line/event/reservation tables; check foreign keys and uniqueness.
P3: Consolidated integrity guard only; DO NOT run older overlapping integrity/reservation/header scripts.
P4: Reviewed V2 ledger operation constraint and dedicated synthetic payable model; check legacy operation compatibility.
P5: Reviewed V2 RPC implementations and final least-privilege grants.
P6: Synthetic seed and negative tests, concurrency, failure injection, reconciliation, regression.
P7: Staging sign-off. Production remains NO-GO.

## Tests and evidence
Capture timestamp, migration SHA, test ID, synthetic buyer/seller/product/order UUIDs, expected and actual outcome, ledger row counts, stock before/after, reservations, events, payable totals, and query logs (redact secrets).
- Wrong user, anonymous and direct-table access: denied.
- Two buyers last stock unit: only one succeeds.
- Repeated identical checkout: one debit; altered digest: rejected.
- Checkout error injected after debit: no persisted debit/order/stock change.
- Eligible cancellation: one reversal, one stock restoration and one event; replay has no write.
- Consumed reservation: no ordinary cancellation/refund.
- Stale price, suspended seller, expired reservation, insufficient balance: no partial state.
- Global wallet idempotency collision across legacy/V2: rejected.
- Service-role direct INSERT bypass: MUST be mitigated or NO-GO.
- Existing single-item checkout/cancel and read APIs: unchanged.

## Recovery decision tree
1. Before any data creation: stop, revoke newly granted V2 RPC EXECUTE if approved and necessary, then restore only newly created V2 objects in reverse dependency order using separately reviewed rollback SQL.
2. After synthetic orders/ledger entries: DO NOT simply DROP V2 tables or DELETE ledger rows. Ledger is append-only; rollback requires reviewed compensating transactions and reconciliation, with approval and audit evidence.
3. If any legacy RPC or wallet behavior regresses: freeze V2 entrypoints, capture evidence, recover staging using verified restore procedure; do not alter production or attempt improvised SQL.
4. If privileged bypass or partial accounting occurs: NO-GO; isolate V2 entrypoints and preserve forensic evidence.
5. Any restore must be rehearsed on staging and independently validated. A document is not a backup.

## Explicit remaining blockers
No actual V2 checkout/cancel RPC, no approved migration, no proven service_role write isolation, no reviewed V2 balanced synthetic seller accounting, no completed adversarial test run. No assertion of deployment readiness is warranted.
