# Academy server-independent integration readiness

**Decision:** Do not connect Oracle, TV, radio, commercial conferencing, or any other server until separately approved. Existing Learning Lab remains the **only** classroom interface; no new classroom page.

## Prepared
- `academy/classroom/classroom-demo-engine.js`: offline synthetic state engine (not wired to the existing UI).
- `academy/classroom/live-classroom-boundary.js`: provider-neutral action/event adapter with **no network calls**.
- `academy-tests/check-classroom-demo.cjs` and `academy-tests/check-live-boundary.cjs`: offline test scripts (passing CI results must be verified independently).
- `docs/academy-live-classroom-contract-v1.md`: room lifecycle, server-authoritative roles, APIs, safeguarding and capacity contract.

## Existing Learning Lab integration plan — no replacement
1. Record UI behavior baseline for nine languages, admission, hand, speaker, remove/reentry, notes, recorded video and intro captions.
2. Move the existing classroom's state transitions behind the offline demo engine **without changing visible behavior**. Regression-test every student A/B/C scenario before each commit.
3. Connect the **same UI event handlers** to the live boundary when server staging is authorized; mode remains explicitly offline until then.
4. Server adapter maps actions and server events to the same state and controls; local role switch remains demo-only.
5. Attach selected media service separately (WebRTC/SFU or approved vendor), only after server-authorized admission. Camera/microphone access is opt-in; never auto-start.
6. Verify cross-device instructor and learner operation, disconnection recovery, moderation, accessible captions, nine locales, safety and audit before real launch.

## Provider decision postponed
Compare Oracle-hosted vs paid managed services against concurrent room count, participant capacity, bandwidth, recording policy, privacy jurisdiction, safeguarding, uptime, accessibility, costs and operational support. Radio and TV workloads must be measured first; no assumed shared capacity.

## Explicit remaining blockers
- UI still runs the original synthetic logic; new engines are **not yet integrated**.
- No authenticated Academy learner/instructor service or database.
- No real-time event server, signaling/SFU or meeting provider.
- No live audio/video, cross-device synchronization, or verified teacher moderation.
- No operational seminar scheduling/attendance.
- No verified CI pass for the new tests.
- No production privacy/security/safeguarding signoff.

**No server selection or deployment has been performed.** A plug-in boundary reduces later rework but does not guarantee instant operation with any vendor; vendor adapter, security configuration and real-device testing remain necessary.
