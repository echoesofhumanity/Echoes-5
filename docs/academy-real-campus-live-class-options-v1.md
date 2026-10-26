# Echoes Academy — Real Campus & Interactive Live Classroom Options V1

Date: 2026-10-26
Status: RESEARCH / RECOMMENDATION ONLY. No deployments, paid subscriptions, production changes, or user-data processing authorized.

## Goal
Evolve the current nine-language Academy preview into a real online learning campus supporting on-demand video, reading/PDF notes, lesson materials, scheduling, instructor-led interactive live video classes, moderated Q&A, attendance/progress, and eventually reviewed assessments/credentials. Preserve the existing cinematic Academy UI and stable program slugs.

## Technology shortlist (verify current provider terms before procurement)
1. **BigBlueButton** — recommended for teaching-oriented live classes: webcam, audio, screen/slides, whiteboard, breakout rooms, polls, recording, API. Prefer dedicated managed hosting initially or an isolated dedicated server. Official installation guidance for BBB 4.0: Ubuntu 24.04, production guidance 16 GB RAM / 8 cores, dedicated host. Sources: https://docs.bigbluebutton.org/administration/install/ and https://docs.bigbluebutton.org/dev/api.html
2. **Jitsi Meet** — leaner quick video pilot; iframe integration, mobile browsers, moderator features. LMS course progress and learning workflows must be built separately. Sources: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
3. **LiveKit** — customizable WebRTC media platform with cloud/self-hosted options; strongest fit for bespoke advanced interactive features, but greater engineering burden. Source: https://docs.livekit.io/transport/self-hosting/
4. **Moodle + BigBlueButton** — serious build-vs-buy LMS alternative. Moodle handles course structure and learning activities; BigBlueButton handles live classes. Requires evaluation for Echoes branding, nine locales, integration and security. Source: https://marketplace.moodle.com/plugins/mod_bigbluebuttonbn

## Recommended architecture
- Existing GitHub Pages Academy remains the public cinematic catalog and entry point.
- Isolated Academy application (future, independently hosted): approved course content, instructor/learner roles, lesson reader, video player, timetable, enrollment, progress, reviews and safeguarding controls.
- Isolated live classroom provider: BigBlueButton as preferred candidate. Backend issues authorized short-lived joins; never place provider secrets in browser or GitHub.
- Isolated media store/CDN for uploaded videos, PDF notes, transcripts, captions and recordings with rights and retention controls.
- Nine-language course metadata and accessible RTL support; real translation review before publication.
- Distinguish **interactive classroom** (small groups, participants may speak/video) from **webinar/broadcast** (larger audience, moderated Q&A) and on-demand replay.

## Delivery gates (indicative, not commitments)
- Phase 1 DONE: public preview and 90 declared synthetic tests; green CI workflow.
- Phase 2 1–2 weeks estimated: adversarial synthetic tests, technology selection, threat model, consent/privacy, cost and operational feasibility.
- Phase 3 2–4 weeks estimated: isolated course reader, on-demand video, notes, timetable, synthetic student/instructor workflows, first camera/mic technical demo.
- Phase 4 2–3 weeks estimated: limited, explicitly consented adult live-class pilot with authenticated moderation, mobile/browser testing and recording controls.
- Phase 5: real student opening only after independent security, privacy, safeguarding, accessibility, reliability, content and operational approvals.
The phases may overlap where isolated tests allow it. No live participant or backend activation is authorized by this document.

## Non-negotiable safety and operational requirements
- Child-safeguarding, guardian consent as legally applicable, moderation, reporting/escalation, restricted recording access.
- Informed recording consent; retention/deletion policy, access logs, signed media delivery, backups and incident response.
- Instructor assignment, review separation, server-side authentication/authorization, deny-by-default access, rate limiting and audit.
- Captions/transcripts, keyboard accessibility, screen-reader testing, Arabic RTL, low-bandwidth/mobile fallbacks.
- Separate capacity plans for 1:1, small class, webinar, recordings; test real concurrent users before scale.
- No accreditation claims or credential issuance before review.
- Do not reuse Radio server, shared production Supabase, production auth, or admin interfaces without independent approval.
- Never inspect/change Admin V3, backups, clones, archives, shared components or unrelated portal pages.

## Immediate next work
1. Add negative tests to candidate synthetic service/HTTP adapter (forged actor, invalid transition, mutated response, unexpected fields).
2. Build a comparison scorecard of Moodle-vs-custom LMS and BigBlueButton-vs-Jitsi-vs-LiveKit for actual costs, hosting, mobile, moderation, recordings, integrations and data residency.
3. Prepare a purely synthetic classroom session schema: class schedule, instructor, attendees, session role, join grant, recording consent, moderation and audit; no live tokens.
4. Request separate approval before provisioning a live conferencing server or creating real accounts.
