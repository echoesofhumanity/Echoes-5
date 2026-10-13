# Echoes Response — Server Authorization Contract (Staging Draft 01)
Date: 2026-10-13. Specification only. No endpoint deployed; no live intake.

## Isolation and trust
Use only the separate `echoes-response-staging` Supabase project. The production portal, Admin V3, marketplace, GitHub Pages and volunteer-facing interfaces have no inherent response-case permissions. `response_private` must stay outside exposed API schemas. Never embed privileged keys in browser code.

## Coordinator authentication
1. Require a valid, audience-checked Supabase Auth access token from the staging project, verified server-side (issuer, expiry, signature, subject).
2. Require an independently approved, active staff roster entry (future private table), verified identity and suitable MFA. An Auth user account alone is not a coordinator.
3. Use an explicit case assignment for the verified subject and requested role. Check `assigned_at <= now()`, `expires_at > now()`, `revoked_at is null`, matching case and scope.
4. Verify the request's exact operation is permitted for the scope and current case state; sensitive disclosures require additional human approval.
5. Apply jurisdiction, minimum-necessary fields, case-specific conflict-of-interest controls, rate limits and audit logging. Deny on missing data, outage or ambiguous authorization.

## Safe execution design
The proposed API is a server-only, least-privilege gateway with separate service identity, not the existing admin CMS. It may access `response_private` only through tightly scoped database functions or policies independently reviewed and tested. The existing `has_active_case_assignment` helper is SECURITY INVOKER and currently inaccessible to client roles; it is not a bypass or complete access policy. Never grant `anon` or `authenticated` broad schema or table privileges.

## Future routes (NOT implemented)
- POST /internal/response/assignments: privileged staff approval, separate human authorization and auditable reason
- GET /internal/response/cases/{caseId}: minimal redacted view, per-case authorization
- POST /internal/response/cases/{caseId}/events: controlled case state transition and append-only audit
No public report submission, alert dispatch, live location or authority notification routes are authorized by this draft.

## Mandatory negative tests before any rollout
- Missing, expired, forged, wrong-project tokens -> deny
- Real Auth account without vetted staff record -> deny
- Staff member with no matching assignment -> deny
- Assignment expired, revoked, not started or wrong scope -> deny
- Different case ID, changed jurisdiction, disallowed state transition -> deny
- Unauthorized role escalation and service-key exposure -> deny
- Backend failure, audit failure, inconsistent timestamps -> deny
- Replayed requests and excessive requests -> deny
- Logs must not contain survivor identity, precise location or secrets

## Operational launch gates
Threat modeling, independent security review, safeguarding protocols, staffing, legal/privacy review, breach procedures, retention/deletion, MFA enforcement, signed institutional referral agreements, and synthetic integration tests must be complete before any real case data is processed.
