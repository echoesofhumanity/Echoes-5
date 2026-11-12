# Governance — Echoes first-six-month zero-cost infrastructure gate
Date: 2026-11-12
Status: planning baseline; no deployment authorized.

## Fixed user targets
- Period: first six months.
- Audience: 500 distinct radio/TV listeners/viewers in total per month, NOT 500 simultaneous.
- Academy: 12 students per interactive class; 16 interactive class-hours/month. Existing design target up to two concurrent classes, not a guaranteed deployed capacity.
- Governance: pilot for up to 25 meeting participants.
- Interpretation languages: TR, EN, RU, ES, DE.
- Additional infrastructure spend target: EUR 0/month. No credit card, subscription, paid API, or automatic paid fallback.
- Oracle production instance: READ ONLY. No configuration, services, deployment, ports, packages, or resource allocation changes. Protect Radio, TV and Learning Lab quotas. No access to Admin V3, backups or clones.

## Architecture decisions
1. Keep GitHub Pages for static portal and governance UI. Do not store credentials or sensitive meeting audio in public repository, Pages or GitHub Actions logs.
2. Keep existing Oracle instance and services untouched.
3. Media distribution should use external free hosting/streaming only if terms, embedding, privacy and limits are verified. Existing radio stream is not modified.
4. Argos GitHub Actions test success proves offline batch translation only. It is not a production low-latency translation API. Actions are not a secure synchronous service for live meetings.
5. Device speech recognition is browser-dependent and may process audio via vendor services; explicit consent is mandatory. It is not meeting-wide speech capture.
6. Browser TTS is a free fallback; genuine female/male cloud voices are not available without separately verified provider entitlement.
7. JaaS Dev MAU constraints and video meeting permissions must be checked before assigning Governance and Academy cohorts. 25 MAU does not mean 25 simultaneous users and does not establish free entitlement for all planned users.
8. Live meeting integration requires an approved, authorized JaaS transcription/audio path, authenticated backend, short retention, access controls and language-quality review.
9. If a truly zero-cost separate secure runtime cannot be verified, pause live server integration rather than burden Oracle or claim live interpretation exists.

## Six-month phased acceptance
M1: inventory and document existing read-only baselines; select no-cost candidate runtime; verify account eligibility, privacy, quotas, cold-start and egress. No deployment to Oracle.
M2: isolated proof-of-concept: one TR->EN text request through an authenticated API, without private meeting data; record response time, cost and error behavior.
M3: five-language text coverage; sample quality review by human speakers; strict rate limits and quotas.
M4: opt-in microphone speech-to-text on one phone and captions on second device; do not claim conference audio integration.
M5: approved meeting audio/transcription integration only if permitted and secure; small participant test with latency and access checks.
M6: up to 12-student interactive lesson pilots and up to 25-person Governance pilot, only within verified free-plan limits; 16 hours/month as a usage ceiling; rollback on overage risk.

## Acceptance gates
- Monthly external spending is zero and no paid plan enabled.
- Existing Oracle CPU/RAM/network/service behavior remains untouched by deployment.
- No private recordings/transcripts leak to public CI artifacts or static pages.
- Correctly distinguish prerecorded video, live streaming, captions and interactive videoconferencing.
- Record monthly distinct audience count separately from concurrent viewers, and 16 instructor-hours separately from student-hours.
- Never promise 500 concurrent streams or 25-way interpreted video on current pilot.
- On free-quota exhaustion, degrade gracefully (captions off / scheduled session postponed), never incur automatic charges.

## Next controlled change
Evaluate separate no-cost hosting candidates with documented resource limits and privacy policies, then choose one only after explicit authorization for any account creation or deployment. First actual technical test: authenticated synthetic text TR->EN request, isolated from Oracle.
