# Echoes Response — Coordinator Approval Security Gap Review
**2026-10-13 · Design review only · NO-GO for deployment**

## Review basis
Reviewed `docs/sql/echoes-response-coordinator-roster-review.sql` and `docs/echoes-response-coordinator-approval-audit-protocol.md` at main HEAD `26e49ab0538ac0743f2640e489be8b30267880c9`. This is a static review, not a penetration test or verification of live Supabase settings.

## Blocking findings
| Priority | Finding | Evidence | Required correction |
| --- | --- | --- | --- |
| Critical | Approval is not authenticated by the database | `approved_by` is only a foreign key; any future privileged writer could supply another user's ID | Server-only identity-bound approval transaction, independently checked approver role, MFA and audit |
| Critical | Two-person safeguarding approval not represented | One `approved_by` field, no second decision | Separate append-only reviewer decisions; require two distinct eligible human reviewers |
| Critical | Transition rules are not enforced | Check constraints validate field shape, not old-to-new state | Atomic allowed-state transitions with expected version and concurrency control |
| High | No tamper-evident audit or fail-closed audit dependency | No audit table or transaction coupling | Restricted append-only audit with transaction failure rollback and monitored integrity |
| High | Revocation can leave stale derived authorization | No revocation epoch/version in contract | Re-check roster and assignments on each request; revoke sessions and invalidate caches |
| High | Roster schema lacks vetted role/jurisdiction proof | Auth FK only; no approved competency or jurisdiction source | Independently managed staff authorization and scope, not caller-provided claims |
| High | Token MFA claim alone is insufficient | JWT `aal2` claim checked in offline prototype | Validate current session assurance, approved factors and policy in trusted service |
| High | SQL does not constrain approval chronology | `approved_at` may be arbitrary; no version or transition metadata | Trusted server timestamps, expected version, signed decision metadata |
| Medium | RLS is default deny but owner/service bypass risks remain | Forced RLS does not substitute for narrowly scoped privileged operations | Review owners, `BYPASSRLS` roles, SECURITY DEFINER functions, search_path and grants |

## Required negative tests before staging rollout
Reject: self-approval; second reviewer equals first; unknown approver; revoked approver; absent MFA; unauthorized jurisdiction; replayed request; concurrent status update; revoked-to-approved; audit write failure; stale session; stale assignment; forged reviewer ID; cross-project token; attempts by anon/authenticated; privileged-function search_path manipulation.

## Deployment gate
No roster migration, live endpoints, staff accounts or real cases until approval transactions, immutable audit design, reviewer independence, scoped permissions and synthetic negative tests are reviewed. The previously blocked Supabase migration remains unapplied. Production Echoes-5 and the production Supabase project must remain untouched.

## Next smallest safe change
Draft a standalone, offline **approval transition state machine and its negative tests**. Do not connect it to Supabase or imply its output proves human identity.
