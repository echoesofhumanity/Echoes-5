# Echoes Global Council — V16 Protected Identity, Delegation and Audit Architecture
Status: DESIGN CONTRACT / NOT IMPLEMENTED / NOT RATIFIED / NO REAL ACCESS
Date: 2026-11-10
Repository scope: echoesofhumanity/Echoes-5 main ONLY
Grounded in: docs/governance-meeting-v9-protected-access-contract.md; docs/governance-v14-organization-delegation-architecture.md; governance-v15.html (synthetic acceptance tested by user)

## 1. Scope and non-goals
V15's task handoff, acceptance, progress, submission and independent-close UI is a browser-local simulation. It is NOT identity verification, actual independent review, server audit or binding governance. V16 defines a production architecture and gates only; no credentials, invitations, live votes, production roles, real cases, payments, or server are created here. Admin V3, backup/clone repos, Academy, Radio, TV, V8 and existing Supabase allocations remain untouched.

## 2. Separation of powers
- Twenty-five verified and currently assigned council seats, including two co-chairs. One eligible vote per seat, subject to bylaws not yet ratified. No co-chair veto or extra vote.
- Council-only: constitution, global policy, consolidated budget, institutional obligations, delegation framework and binding institutional votes.
- Portfolio seat: accountable stewardship, reporting, bounded operational delegation and proposal submission; not unlimited approval or access.
- Cluster coordinator: can assign/accept and make bounded operational decisions only under a versioned council-approved mandate, budget and safeguards.
- Expert/implementer: may view and work only on specifically assigned permitted tasks.
- Independent reviewer: separately authorized reviewer, with no involvement or conflict in the task under review. Cannot approve their own work.
- Invited guest/interpreter/technical moderator: meeting participation only as authorized; NEVER council voting or automatic cluster privileges.
- Conference/JaaS moderator is not a governance role and grants no council vote.

## 3. Proposed security architecture (not yet selected or provisioned)
Public GitHub Pages UI -> authenticated API boundary -> server-side authorization and policy engine -> isolated protected database/audit storage. Identity provider, hosting, database, audit integrity and key management require explicit selection and isolation verification before deployment.
Never embed signing keys, service-role secrets, JWT signing material or privileged database credentials in browser code, GitHub Pages, URLs, screenshots or client logs.
Use short-lived user sessions and server-verified identity on every privileged request; recheck seat assignment, membership status, mandate, task scope and revocation at execution time. Use strong MFA for privileged accounts, rate limits, session invalidation, CSRF protection where applicable, and appropriate transport encryption.
Public demo data must remain separate from private production data and never be silently migrated.

## 4. Minimal data entities (proposed, not deployed)
- member(id, identity_provider_subject, status, verified_at, preferred_language)
- council_seat(id [01..25], member_id, active_from, active_to, status) with exclusive active assignment per seat and member
- role_grant(id, member_id, role, scope_type, scope_id, granted_by, approved_by, starts_at, expires_at, revoked_at, policy_version)
- cluster(id, portfolio_seat_id, mandate_version, policy_ref, budget_limit_ref, safeguarding_ref)
- task(id, cluster_id, type, title, classification, state, created_by, assignee_id, policy_version, created_at)
- task_transition(id, task_id, from_state, to_state, actor_id, timestamp, reason, policy_decision_ref)
- task_review(id, task_id, reviewer_id, verdict, conflict_attestation, timestamp, evidence_ref)
- institutional_proposal(id, originating_cluster_id, submitted_by, canonical_text_ref, state, reviewed_by)
- meeting/invitation/motion/vote/decision_record as specified by V9; votes unique per motion and eligible seat/member as policy requires
- audit_event(id, actor_id, action, object_ref, decision, timestamp, request_id, integrity_ref)
Protected case content, if ever authorized, must be isolated in a separately classified store; task metadata must not leak protected personal details.

## 5. State machine and permissions
Operational task: draft -> offered -> accepted -> working -> submitted -> reviewed_closed, or offered -> declined. Reassignment, reopening, cancellation and escalation need explicit policies and audit events before production implementation.
- Create/offer: authenticated portfolio seat or coordinator holding an active grant scoped to that cluster, within mandate.
- Accept/decline: only the specifically assigned verified member; no UI impersonation of a role.
- Work/submit: assigned verified member, within classification and grant.
- Review/close: separate verified reviewer with an explicit independent review grant, appropriate competence, and no conflict of interest; cannot be task creator, assignee or beneficiary.
- Institutional proposal: draft -> expert/legal review -> council agenda pending. No task workflow action creates a binding vote or decision.
- Safety/escalation: block task progression where safeguarding, protected-data, legal, fraud or mandate constraints fail; specialist response is separate from any synthetic public workflow.
- Every transition: check authentication, active membership, role scope, task state, mandate/budget, conflict policy and idempotency; write transition + audit atomically or reject both.

## 6. Authorization matrix
| Action | Council seat | Cluster coordinator | Assigned expert | Independent reviewer | Guest |
|---|---|---|---|---|---|
| View own scoped operational records | Within scope | Within cluster | Assigned only | Assigned review only | Deny |
| Offer operational task | Within delegated scope | Within mandate | Deny by default | Deny | Deny |
| Accept/submit assigned task | Only if assigned and separation permits | Only if assigned | Yes, if assigned | Deny for reviewed task | Deny |
| Independently close task | Only with separate independent reviewer grant and no conflict | Same constraint | Same constraint | Yes, assigned and conflict-free | Deny |
| Submit institutional proposal | Authorized, reviewed | Propose to council pipeline | Draft/support only | Review as assigned | Deny |
| Cast institutional vote | Verified eligible active council seat only | Deny unless independently a verified council member acting in that capacity | Deny unless independently eligible seat | Deny unless independently eligible seat | Deny |
| Issue JaaS room moderator token | Never from UI; server checks separate meeting permissions | Same | Same | Same | Same |

## 7. Audit, privacy and retention
Audit must be server-generated, append-only/tamper-evident and independently reviewable, with synchronized timestamps, actor, subject, decision outcome, request correlation and policy version. Browser-generated history is not an audit log.
Define lawful basis, data controller, retention, deletion/legal hold, data subject rights, cross-border transfers, incident response and minors' data handling with qualified legal/privacy review before storing real personal information. Default to no audio/video recording or transcription without explicit consent and retention decisions. Publish only aggregated, non-identifying council/cluster reports.
Separate task creation, spending approval, payment execution, reconciliation and audit. No self-approval or bypass by a co-chair or system moderator.

## 8. Negative acceptance tests (must pass on an isolated backend)
T01 anonymous -> task read/write denied.
T02 expired/revoked member -> all privileged operations denied immediately per verified session invalidation policy.
T03 coordinator cluster A -> cluster B task denied.
T04 expert not assigned -> task access denied.
T05 guest/technical moderator -> vote denied server-side.
T06 co-chair -> exactly one vote, no veto or additional privileges.
T07 duplicate vote -> rejected by server and database uniqueness; threshold/quorum not implemented until ratified.
T08 task creator/assignee -> independent review/closure denied.
T09 invalid transition (offered -> closed) -> denied.
T10 institutional proposal -> no automatic vote.
T11 expired or revoked invitation -> protected meeting access denied, provider revocation behavior tested.
T12 cross-room JWT / replay / forged moderator token -> denied by verified issuer, audience, room, expiry and signing checks.
T13 budget/mandate exceeded -> operational action denied/escalated.
T14 sensitive task details -> absent from public pages, logs, exports and unrelated role responses.
T15 concurrent updates -> one valid state transition with consistent audit, no double-close.

## 9. Implementation gates / go-no-go
G0 Confirm 25-seat/cluster mapping and approve draft role definitions, conflict rules, review independence, delegation limits and governance bylaws.
G1 Select an explicitly authorized isolated identity/backend/database project; inventory existing projects before any allocation; no reuse without approval.
G2 Approve data classifications, lawful basis, retention, recovery, incident handling and independent audit owner.
G3 Implement backend identities, MFA, scoped grants, RLS/authorization checks and deny-by-default endpoints; no real data until verified.
G4 Implement task transitions and immutable evidence references with server audit and independent reviewer separation.
G5 Implement meeting invitations and protected JaaS token issuer separately; test negative cases and provider behavior.
G6 Implement voting only after ratified quorum, abstention, certification and appeal rules; test independent vote integrity.
G7 Perform measured device/capacity tests at 2/5/10/15/25; monthly active user limits do not prove concurrency.
G8 Controlled pilot with authorized test accounts, then security/legal review before production launch.

## 10. Decision required before any live integration
The next action is to identify and approve a dedicated backend/identity environment and policy owners, without touching existing Supabase/Oracle/other services. Until then V8/V14/V15 remain synthetic and the governance room is not represented as private, production-ready, 25-camera-proven or capable of binding votes.
