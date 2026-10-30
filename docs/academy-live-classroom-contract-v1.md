# Echoes Academy — Interactive Live Classroom Contract V1

**Status:** Implementation-ready interface design, NOT a deployed multi-user service.  
**Scope:** `Echoes-5/main`, Academy-owned files only. No Admin V3, backup, shared auth, production database or external meeting integration changes.

## Verified starting point
The Learning Lab already demonstrates local synthetic room admission, instructor moderation, hand raising, speaking queue and a 12-seat classroom. The simulation has no shared state, authenticated teacher or learner, networked audio/video, or cross-device synchronization. Preserve it as a regression fixture, not a real class.

## Distinct capabilities
1. **Recorded lesson:** versioned published video, localized captions, notes, progress.
2. **Interactive learning:** individual activities, moderated Q&A, quizzes, accessibility support.
3. **Live classroom:** scheduled session, authenticated admission, teacher-controlled participation, real-time signaling, optional audio/video.
4. **Seminar:** a scheduled live event using the same room engine but separate registration, capacity and moderation policy.

No demo activity can issue attendance, progress, assessment or certificate records.

## Architecture boundaries
- Public GitHub Pages hosts the Academy client only; it cannot enforce access controls or securely coordinate rooms by itself.
- Isolated Academy backend owns identity/session verification, admission, room state, roles, audit, retention and moderation decisions.
- Real-time transport broadcasts *authorized server events* to participants. Client-side controls only request actions.
- Media service (WebRTC/SFU or vetted managed provider) handles live audio/video separately from lesson videos; do not expose provider credentials or permanent meeting URLs in public source.
- Recording, public chat, direct messages, screen sharing and learner-to-learner media are **disabled by default**, especially for minors.
- No production vendor, credentials, backend resources or hosting choice is approved by this document.

## Room lifecycle
`scheduled → lobby_open → live → ended → archived`. An instructor may cancel a scheduled session. A disconnected learner must reauthenticate and recover only their authorized state; never assume automatic readmission.

Participant lifecycle: `invited → waiting → admitted → removed`, with `denied` as a terminal request outcome. Reentry after removal requires a **new** request and explicit instructor approval. Every transition is scoped to room, principal and role.

Speaking lifecycle: `idle → hand_raised → queued → speaking → idle`; instructor may mute/revoke a turn, remove a participant, or close the queue. At most one active speaker in the moderated single-speaker mode. A learner cannot grant themselves microphone publishing rights.

## Proposed server API (design, not implemented)
- `GET /academy/v1/sessions/{sessionId}`: authorized session metadata and permissions.
- `POST /academy/v1/sessions/{sessionId}/entry-requests`: request admission, idempotency key required.
- `POST /academy/v1/sessions/{sessionId}/admissions/{requestId}/decision`: instructor accepts/denies, server role check.
- `POST /academy/v1/sessions/{sessionId}/hand`: raise/lower own hand when admitted.
- `POST /academy/v1/sessions/{sessionId}/speaking-turns`: instructor grants/revokes a turn.
- `POST /academy/v1/sessions/{sessionId}/participants/{participantId}/remove`: instructor removal.
- `GET /academy/v1/sessions/{sessionId}/events?after={cursor}`: authenticated event catch-up.
- `POST /academy/v1/sessions/{sessionId}/media-token`: short-lived, scoped token only after admission and media policy checks.

All mutating requests require authenticated server-enforced authorization, CSRF protections where applicable, rate limits, replay/idempotency handling and audit events. Do not put identities or secrets in URL query strings.

## Minimal event envelope
```json
{
  "schema_version": 1,
  "event_id": "synthetic-uuid",
  "session_id": "synthetic-session",
  "sequence": 12,
  "type": "participant.admitted",
  "subject_id": "synthetic-participant",
  "occurred_at": "2026-01-01T00:00:00Z"
}
```
Events are emitted only by the server. Clients must discard stale/out-of-order events, resynchronize after gaps and never treat locally generated messages as authoritative. Do not include child disclosures, raw audio, sensitive case details or meeting credentials in event payloads.

## Room capacity and roles
- **Initial classroom capacity:** 12 admitted learners as a *pilot default*, configurable only by authorized operations; this is not a validated educational optimum.
- Instructor and co-moderator capacity are separate from learner seats.
- Waiting requests do not consume seats; admission is atomic and capacity-checked server-side.
- Instructor: admit/deny, manage queue, revoke speaker, remove, end session.
- Learner: request entry, raise/lower own hand, speak only while authorized.
- Observer: read-only when explicitly permitted.
- All roles assigned and verified server-side; the existing simulated instructor/learner switch must never be used for real privileges.

## Accessibility, privacy and safety
- Keyboard-operable controls, visible focus, aria-live updates without overwhelming announcements, captions/transcripts and low-bandwidth fallback.
- Nine Academy locales: `en,tr,es,fr,de,pt,ru,ar,zh`; Arabic RTL; no fake translation approval.
- For minors: safeguarding owner, age/guardian policy where required, teacher moderation, no unsupervised direct contact, incident reporting outside the public room log.
- Camera and microphone permission requested only after explicit user action and admission; no silent recording.
- Define jurisdiction-specific retention, data deletion, emergency escalation and consent before real-user staging.

## Release sequence and acceptance
1. Preserve current nine-language demo baseline and intro video.
2. Implement a **local-only adapter** exposing the same actions and event schema with synthetic identities; keep it visibly marked demo.
3. Add contract tests: denied self-admission, role spoofing, double admission, capacity race, stale event, removal/reentry, speaker revocation, disconnection/recovery, session end.
4. Obtain explicit approval for isolated staging backend and chosen media provider; no shared production services.
5. Implement authenticated server authority, room transport and short-lived media grants in staging.
6. Test two or more devices, teacher/learner roles, accessibility, nine languages, privacy and safeguarding.
7. Independent review, operational runbook, rollback and explicit production approval.

**Definition of done:** A room is not 'live' merely because local demo buttons work. Real live readiness requires verified cross-device synchronization, authenticated admission, reliable media transport and safeguarding controls.
