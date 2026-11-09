# Echoes Global Meeting Chamber — V6 Capacity and Multilingual Architecture
Status: DESIGN / NO-GO for real council use
Repository scope: Echoes-5/main only
Date: 2026-11-09

## Purpose and binding requirements
- Support **25 simultaneous council members**, each permitted to publish camera and microphone, subject to device permissions and meeting moderation.
- Support **two co-chairs** who coordinate the meeting; their technical moderator permissions do not grant extra institutional votes.
- Support invited cluster representatives who can speak if authorized but cannot cast institutional council votes.
- Offer per-person caption selection in **Turkish (tr), English (en), Russian (ru), Spanish (es), German (de)**.
- Preserve love, compassion, justice, dignity, equal participation and volunteer governance.
- Keep V1–V5 demos unchanged. Do not touch Admin V3, backups, clones, Radio, TV or Academy infrastructure.
- No production activation, real member data, live voice capture or vendor credentials until separately authorized.

## Architecture: separate trust boundaries
1. **Conference plane**: Jitsi-compatible SFU-based multiparty conferencing; browser/mobile clients; active speaker and adaptive video receive constraints. Jitsi public meet.jit.si is **only a pilot**; its availability, moderation, data processing and 25-person capacity are not guaranteed by this document.
2. **Identity / governance plane**: future server-verified council member accounts, role mapping, invited guests, meeting scheduling, access control, minutes and durable voting audit log. Static GitHub Pages alone cannot enforce any of these.
3. **Caption plane**: authorized speech source -> consent/notice -> speech-to-text -> optional source-language detection or explicit selection -> translation into selected languages -> authenticated caption delivery to attendees. Browser access to a cross-origin Jitsi iframe's internal audio streams is not assumed. Evaluate a Jitsi-integrated transcription/bot pathway or a separately controlled conference deployment before claiming live transcription.
4. **Data boundary**: no audio, transcripts, member identity or sensitive meeting documents in public GitHub repositories, public test rooms, localStorage or third-party services without review. Prefer ephemeral caption delivery and explicit retention policy; written board decisions require human verification against original speech.

## Capacity assumptions (targets, not verified)
- 25 participants present, up to 25 cameras on and microphones enabled (speaking simultaneously is not a meaningful intelligibility goal).
- Typical grid: 25 tiles on desktop; mobile shows active speaker plus limited thumbnails, with pagination where needed.
- SFU forwards selected video streams, not a full 25-way peer-to-peer mesh; adaptive simulcast/last-N/receiver constraints are required.
- 2–3 hour meeting target, 5 language caption selection, screen sharing and accessible controls.
- Do not estimate a fixed bandwidth or server bill without measurements and chosen codec/resolution/topology.

## Roles and permissions
- Council member (25): equal institutional voting eligibility, subject to approved constitution; technical permissions independent.
- Co-chair (2 of 25): meeting coordination, facilitation and moderation; exactly one institutional vote each.
- Invited cluster participant: permitted presentation and operational reporting, **no institutional board vote**.
- Technical operator: may manage media/session infrastructure but cannot cast a board vote unless separately an eligible council member.
- Real enforcement requires authenticated server-side authorization; UI-only badges are not security.

## Acceptance gates
A. **Architecture**: select conference host (managed/self-hosted) and confirm moderator authentication, embedding restrictions, data location, costs and operating responsibility.
B. **Five-person baseline**: two browsers plus mobile, camera/mic, screen share, joining/leaving, rejoin, moderation, audio quality, accessible caption positioning.
C. **Scale ramp**: 5 -> 10 -> 15 -> 25 distinct simultaneous real endpoints (or credible load tools plus a representative set of real devices). Record successful joins, disconnects, CPU, network, per-device heat/battery, delay, packet loss and quality. Do not mark capacity verified without evidence.
D. **Language**: for each of five source languages test captions into each of the other four (20 directed pairs), measure end-to-end caption latency, speaker attribution, errors, interruptions, terminology, numbers and proper names. Require independent validation of translated decisions.
E. **Security**: threat model, identity/roles, access revocation, meeting admission, consent, retention, incident handling, auditability and vendor terms approved before production.
F. **Operations**: 2–3 hour endurance run, reconnect after network changes, backup host/alternate dial-in plan, facilitator instructions and documented failure mode for unavailable translation.

## Recommended phased implementation
1. Retain V5 as approved UI baseline. Write architecture and test matrix only (this file).
2. Choose the hosting/moderation approach; **do not buy or provision infrastructure yet**.
3. Build isolated synthetic caption stream and role/meeting-state simulator without claiming real speech recognition.
4. Test a consented live speech-to-text prototype with one authorized test speaker outside real council sessions.
5. Add protected translation distribution, validate 20 language pairs and verify caption overlay behavior.
6. Execute the 25-endpoint load test, choose capacity tier and operational budget based on measurements.
7. Only then consider production activation and real council meetings.

## Current verification
- V5 mobile expanded-view and exit behavior were user-tested successfully.
- Public Jitsi embed, prejoin and permissions were user-tested; actual conference hosting was blocked pending authenticated moderator.
- V3/V4/V5 captions are **prewritten examples**, not real-time speech translation.
- 25 simultaneous video participants, real caption streaming, authenticated moderator, voting and persistent records: **NOT TESTED / NOT IMPLEMENTED**.
