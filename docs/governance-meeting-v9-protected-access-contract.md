# Echoes Global Meeting Chamber — V9 Protected Governance Contract
Status: DESIGN ONLY — NOT AN AUTHENTICATED SERVICE
Date: 2026-11-09
Scope: Echoes-5/main. Do not alter Admin V3, backups, clones, Academy, Radio, TV or existing V8.

## Verified baseline
- User-confirmed: two separate phones joined the same JaaS room through the V8 portal.
- V8 has no protected member identity, durable voting, invitation gate, production moderator tokens or live multilingual speech translation.
- Developer tier allowance of 25 monthly active users is not evidence of 25 concurrent stable cameras.

## Cultural foundation
- Love, compassion, justice, human dignity, equal voice and voluntary service are design requirements, not decorative copy.
- Two co-chairs are coordinators, not privileged corporate voters.
- All 25 council members have one institutional vote each. Invitations to clusters do not grant a council vote.
- Clusters make authorized operational decisions independently under council-approved policies, budgets and safeguarding rules; they are not required to ask the board about every operational action.
- Small reimbursements/allowances from the constrained operating share require transparent accounting and conflict-of-interest controls; avoid representing them as wages or tax-exempt without local legal review.

## Separated permissions
1. **JaaS conference access**: can join audio/video, screen-share as permitted, speak, raise hand; moderators can mute/remove/manage meeting as delegated. This must NOT be conflated with institutional vote eligibility.
2. **Governance access**: member identity, board seat, attendance, proposal creation, voting eligibility, abstentions, decisions and audit trail. Server verifies identity and eligibility on every privileged action.
3. **Guest access**: invited cluster lead, interpreter, technical support or expert; scoped attendance and optional speaking; no institutional voting endpoint access.
4. **Operational access**: salkım permissions for routine delegated decisions; cannot escalate to board-wide governance powers merely by role label.

## Identity and token boundary
- Static GitHub Pages cannot securely mint JaaS moderator JWTs, store signing keys or enforce council voting.
- Choose a separately controlled identity/backend service; issue short-lived, room-scoped JaaS JWTs only after verifying membership and meeting invitation.
- Signing private keys stay exclusively in protected server secrets, never GitHub, browser JavaScript, query parameters or screenshots.
- A public application ID is not a secret; a private signing key, access token or usable JWT must be treated as sensitive.
- Prefer named, expiring, single-meeting invitations with server-side revocation; validate provider capabilities before promising immediate token revocation.
- Authentication and authorization must be tested on real backend before any real council data is used.

## Proposed minimal entities
- member(id, status, preferred_language, verified_identity_ref)
- council_seat(id, member_id, role, active_from, active_to)
- meeting(id, scheduled_at, state, classification)
- invitation(id, meeting_id, member_id_or_guest_id, role, expires_at, revoked_at)
- attendance(id, meeting_id, member_id, joined_at, left_at)
- agenda_item(id, meeting_id, proposer_id, text, state)
- motion(id, meeting_id, agenda_item_id, decision_class, wording, state)
- vote(id, motion_id, council_member_id, choice, timestamp) with unique(motion_id,council_member_id)
- decision_record(id, motion_id, certified_text, approvals, published_at)
- audit_event(id, actor_id, action, object_ref, timestamp, integrity_ref)

## Decision safety
- Thresholds, quorum and abstention rules are **draft governance matters**, not approved bylaws.
- Votes must be independently cast and verified; moderator/co-chair technical privileges must not create additional votes.
- Prevent duplicate votes and guest votes at database authorization layer, not by hiding UI buttons.
- Any translated motion must be shown in the member's language and verified against a canonical text before binding vote; provide an accessible correction process.
- Avoid recording sensitive video/audio or transcripts by default; explicit consent and retention decisions required.

## Implementation gates
A. Identify a permitted isolated backend project (existing or new) and confirm it is NOT used by existing marketplace/academy production work.
B. Approve roles, access/retention policies and data classifications; do not infer legal registration status.
C. Implement protected auth, membership and invitation records with RLS/server-side verification.
D. Implement a protected token issuer for JaaS using server-only credentials; verify issuer, audience, expiry, room and moderator scope against provider docs.
E. Add V9 protected meeting UI as a separate page; V8 remains untouched.
F. Run negative tests: anonymous, expired invitation, revoked member, guest attempting vote, replayed token, nonmember, cross-room access, duplicate vote.
G. Run two-phone meeting test, then 5/10/15/25 endpoint load tests with measurable evidence.
H. Add actual consented speech recognition and five-language translation only after audio authorization and privacy review.

## Current NO-GO
Do not call the room private, access-controlled, safe for real council deliberations, ready for 25 simultaneous members or equipped with live translation until the corresponding gates pass.
