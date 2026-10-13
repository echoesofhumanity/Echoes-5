# Echoes Response — Coordinator Approval Audit Architecture
**Design draft 01 · 2026-10-13 · REVIEW ONLY / NO-GO**

## Scope and boundary
This document defines a proposed, **not implemented**, audit architecture for the isolated `echoes-response-staging` project. No SQL migration, live staff enrollment, endpoint, case data, or permissions are authorized. Production and backup repositories are out of scope. The previously blocked roster migration remains unapplied.

## Security objectives
Every proposed coordinator transition must have independently verified actor identity and current staff authorization, case-appropriate safeguarding reviewer separation, a valid state/version change, and a durable audit record committed in the **same database transaction**. If the audit write fails, the status change must roll back. No user-supplied timestamp, approver ID, or MFA boolean is proof.

## Proposed restricted data model (not executable SQL)
- `coordinator_roster`: staff identity, lifecycle status, monotonically increasing `version`, current approved role/jurisdiction references; no public client write grants.
- `coordinator_review_decisions`: one row per reviewer decision, unique event/decision ID, target identity, reviewer identity, decision, policy version, authorization evidence reference, creation timestamp from trusted service, and minimal reason code. Separate human reviewer identities for high-risk approval.
- `coordinator_audit_events`: append-only event ID, target staff ID, transition ID, actor and second reviewer IDs where applicable, prior/new status and version, correlation/request ID, event timestamp, reason code, decision reference IDs, policy version, integrity metadata. **Never** store JWTs, credentials, personal narratives, precise locations or case details.
- `coordinator_request_dedup`: scoped idempotency key with actor, target, operation, request fingerprint, committed result reference and expiry/retention; reject conflicting reuse.
- `coordinator_audit_integrity_anchors`: periodic externally anchored checkpoints for tamper evidence; a hash chain **alone** is not immutable if a privileged operator can rewrite the entire chain.

## Trust and access
Only a reviewed, narrowly scoped server-side transition executor may write roster changes and audit events. The executor obtains reviewer identity from verified session context, checks independently managed role/jurisdiction and current MFA assurance, and checks each distinct reviewer's eligibility. Client roles `anon` and `authenticated` receive **no direct grants**. Privileged database roles, owner bypass, `SECURITY DEFINER` search paths, encryption keys, retention and break-glass access require independent review. No public API may expose audit content.

## Atomic approval transaction — proposed sequence
1. Authenticate the request against the correct project and validate current assurance; obtain authoritative actor identity. Do not accept client-asserted reviewer IDs or status.
2. Load current reviewer role/jurisdiction, target staff vetting/training and all distinct approval decisions. For high-risk safeguarding activation, require **two separate eligible humans**; approvals must be current and bound to the same target, requested role and policy version.
3. Acquire transaction lock on the target roster; check current status and `expectedVersion`. Reject forbidden transitions, self-approval, stale authorization, conflicting request replay, or terminal revocation.
4. Generate server-side event ID and timestamp. Write reviewer decision references, transition audit event, and new roster status/version **in one transaction**. If any step fails, roll back all changes.
5. Commit and return only an opaque request result. For suspension/revocation, invalidate derived access and require fresh roster/assignment checks on every subsequent case operation. Failed invalidation must not permit access.
6. Reconcile committed transitions against append-only audit and independently anchored checkpoints; alert on missing events, unexpected privileged writes, broken sequence or integrity mismatch.

## Integrity and retention
Append-only is a policy enforced through privilege isolation and monitoring, not a magical property of SQL. Use restricted writers, separate audit readers, tamper-evident hashes with external checkpointing, and documented incident response. Specify data minimization, lawful retention/deletion rules, backup recovery, and independent reviewer access before any implementation. Avoid claiming absolute immutability.

## Negative test gates
- Missing/invalid reviewer identity; forged reviewer ID; absent current MFA; unauthorized reviewer jurisdiction; expired training; self-approval.
- High-risk activation with one reviewer, same reviewer twice, stale reviewer decision, or reviewer identities not matching authenticated sessions.
- Replayed or conflicting idempotency key; concurrent version race; revoked-to-approved transition; stale roster or assignment.
- Audit insert failure must roll back roster update; audit event without matching transition must be detected; privileged audit mutation and checkpoint mismatch must alert.
- Suspended/revoked staff attempting case access; stale JWT or cached permissions; client attempting direct writes or audit reads.

## Acceptance criteria before any staging implementation
Independent security and safeguarding review; explicit deployment approval; reviewed roles and transaction boundaries; reproducible synthetic tests (including concurrency and forced audit failures); verified fail-closed revocation; external integrity monitoring; documented retention and recovery. **Current status: NO-GO.**

## Next safe development step
Build an offline synthetic audit-event validation/test module. It must neither write to Supabase nor claim real-world evidence provenance.
