# Echoes Academy — Zero-Cost Interactive Classroom Contract V1

Date: 2026-10-26
Status: DESIGN ONLY — no video provider account, deployment, meeting room, or paid resource.

## Objective
Enable an interactive online class experience at **zero monetary cost**: live camera/audio and moderated Q&A, with reading notes, on-demand media and a schedule on the Academy campus. Do not assume free software provides free video hosting.

## Synthetic classroom model (future test fixtures)
- sessionId: immutable synthetic ID
- programSlug and courseRevisionId: known Academy draft content only
- scheduledStart and durationMinutes: informational UTC values
- instructorId: synthetic assigned instructor
- participantLimit: explicit small pilot cap, provider-dependent
- deliveryMode: external_meeting_link | embedded_meeting (conditional on verified provider policy)
- sessionStatus: draft | scheduled | cancelled | finished
- meetingProvider: candidate only; never embed a provider secret or public live join token in GitHub Pages
- joinGrant: ephemeral server-issued grant only after real auth exists; in synthetic phase, always disabled
- moderation: host admission, mute/remove, report, waiting room, participant roles
- recording: off by default; explicit informed consent and retention review required before activation
- safeguarding: no minor pilot until guardian/child safety policy, expert review and escalation exist
- accessibility: captions/transcripts and mobile/low-bandwidth options subject to provider support
- cost: no subscription, server charge, credit card trial, or overage risk permitted

## Zero-cost platform feasibility gates
1. Confirm actual free service limits and terms for participants, session length, embedding, moderation and commercial/nonprofit use.
2. Confirm privacy/data residency, recording defaults, account requirements and acceptable-use terms.
3. Test mobile Android/iOS, browser microphone/camera permissions, network failure, instructor controls.
4. Confirm $0 sustainable operation with no credit card and no surprise billing; if not possible, use external link or defer live video.
5. Keep provider behind replaceable adapter: never hard-code provider URLs in course records.

## Suggested rollout
- Offline: synthetic session schema and negative tests; no camera access.
- Static Academy: public seminar schedule and educational reading/video previews, no private learner data.
- Adult-only controlled pilot: moderator-led external free meeting only after provider verification and consent; no recording.
- Integrated classroom: only after authentication, secure join grants, accessibility and safeguarding controls; may remain deferred at $0.

## Protected boundaries
No Admin V3, backups, clones, shared Supabase, shared auth, live Academy HTML, Radio infrastructure, or unrelated modules touched. No production credentials or user records.
