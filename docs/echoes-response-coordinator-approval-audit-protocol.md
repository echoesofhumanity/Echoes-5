# Echoes Response — Coordinator Approval and Audit Protocol
**Draft 01 — review only, 2026-10-13.** No endpoint, user privilege, or database migration is authorized by this document.

## Approval boundary
A Supabase Auth identity is necessary but not sufficient. A candidate must be identity-checked, vetted for the applicable safeguarding role and jurisdiction, trained, and enrolled in enforced phishing-resistant MFA where feasible. The roster's `approved` status alone must never grant access to a case. Only a designated, independently vetted approver may decide, and no one may approve their own account. For high-risk safeguarding roles, require two distinct human approvals before activation.

## Permitted lifecycle
- `pending -> approved`: verified identity, staff authorization, required training/MFA, jurisdiction, signed approval reason and reviewer identities recorded
- `pending -> revoked`: rejection with minimally necessary reason
- `approved -> suspended`: immediate hold on suspected compromise, inactivity or safeguarding concern
- `approved -> revoked`: permanent removal of operational authorization, preserve lawful audit history
- `suspended -> approved`: only after fresh checks and independent reapproval
- `suspended -> revoked`: close authorization
- `revoked`: terminal; reinstatement requires a new controlled enrollment process, not a direct status flip

## Server-side transition transaction (future design)
1. Validate the staging project's signed token, verified MFA assurance, staff approver role, and fresh authorization.
2. Validate target identity and current state; require two distinct reviewers where indicated. Never trust a caller-provided `approved_by` or `approved_at` as proof.
3. Lock the roster row and compare expected status/version to prevent concurrent or replayed approval.
4. Record immutable, minimally necessary audit metadata and update status atomically; fail closed if audit cannot be written.
5. Invalidate active sessions/derived access as appropriate after suspension/revocation; enforce the status on **every** case request rather than relying on token lifetime.
6. Require an independent, active, case-scoped assignment before any case read or modification.

## Audit event contract
Include event ID, target staff ID, actor ID, second reviewer ID if required, action, prior/new status, decision timestamp, reason code, request/correlation ID and integrity evidence. Do not store personal narratives, patient information, precise location, passwords, bearer tokens or secrets in logs. Define retention, tamper-evidence and reviewer-only audit access in the security review.

## Required rejection tests
Self-approval; unverified identity; absent/weak MFA; approver without role; one reviewer on a two-person decision; expired approval; invalid transition; revoked-to-approved; replayed request; simultaneous approvals; cross-project tokens; stale roster; audit write failure; suspended staff with an otherwise active assignment; and a valid staff account requesting another case.

## Existing roster SQL draft review findings
The draft `coordinator_roster` check constraints only enforce field consistency. They do **not** enforce authorized state transitions, true human review, MFA or immutable audit. `approved_by` is a reference, not proof of authority. The draft must remain unexecuted until a separate security review and server-only transaction implementation address these gaps. Default-deny RLS and no client grants remain mandatory.

## Scope
This protocol is design-only. No real reports, emergency dispatch, public search publication, case disclosure or operational coordinator access is enabled.
