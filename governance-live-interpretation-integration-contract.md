# Echoes of Humanity — Governance Live Interpretation / TTS Integration Contract
Status: design-only, not deployed. Date: 2026-11-11. Scope: Echoes-5/main governance meeting pilot.

## Verified baseline
- Governance navigation between portal, center, documents and pilot pages passed user mobile testing.
- `governance-center-jaas-v8.html` and `governance-center-jaas-v11b.html` embed an external 8x8 JaaS meeting pilot on demand.
- Current five-language subtitle demonstration (TR/EN/RU/ES/DE) uses **prewritten sentences**. Overlay is synthetic, not live speech recognition or machine translation.
- Meeting pilot lacks authenticated participant identity, protected meeting authorization, real council voting and private transcripts.
- Current overlay position is within the video stage, including expanded view. It is not speaker-anchored and is not proof of live transcription.

## Target user experience
- Participants select their own listening/reading language, independently of the speaker's language.
- Phase 1: Turkish <-> English speech-to-text, machine translation, subtitle overlay near active speaker where technically supported, optional text-to-speech playback.
- Expand to TR, EN, RU, ES, DE, FR, PT, AR, ZH only after provider-specific language and quality verification.
- Display original-language transcript and translated subtitle separately, with a visible language tag and a clear 'automated translation' indicator.
- Preserve original meeting audio by default; translated TTS is opt-in and individually adjustable/mutable.
- Consent and explicit recording/transcription notices are mandatory. Do not silently capture meeting audio.

## Proposed separated components (not yet implemented)
1. Meeting adapter: supported JaaS events and speaker/participant metadata, subject to provider verification.
2. Audio ingress: consented participant audio source and permissions. Do not assume JaaS iframe provides remote participants' audio tracks to the host page.
3. STT: streaming transcription with source language and interim/final segments.
4. Translation: streaming final/partial translated segments; preserve speaker ID and timestamps.
5. Subtitle presenter: position inside video stage; use a safe fallback strip when speaker coordinates cannot be reliably obtained.
6. Optional TTS: per-user language, voice, output device and volume; echo suppression and avoiding retransmission into the microphone.
7. Security: access control, transport encryption, minimum retention, provider agreements and explicit data deletion policy.

## Message contract proposal (not a production API)
```json
{"meetingId":"synthetic-id","speakerId":"synthetic-id","segmentId":"synthetic-id","sourceLang":"tr","targetLang":"en","sourceText":"...","translatedText":"...","startMs":0,"endMs":1000,"isFinal":true,"confidence":null}
```
Never place participant names, meeting tokens, private audio, transcripts or API keys in GitHub Pages source or browser localStorage.

## Acceptance gates
A. Confirm JaaS provider permits supported audio access/streaming integration, meeting authentication and 25 simultaneous video participants within actual plan/quota.
B. Choose STT, translation and TTS providers based on measured latency, language coverage, Turkish accuracy, mobile browser compatibility, cost and data processing agreements.
C. Build a **synthetic text-driven overlay** isolated from voting code; verify subtitle placement, accessibility, RTL Arabic and nine-language UI.
D. Test consented live Turkish-English STT and translation with two devices; measure end-to-end latency, caption accuracy, interruptions, overlapping speakers, reconnects.
E. Add optional TTS without audio feedback, verify audio routing on Android/iOS.
F. Expand language pairs, test 25-participant meeting load, translation concurrency and spending limits.
G. Only after security/legal and operational approval may the service be used for real governance meetings. Binding decisions must be confirmed in writing.

## Guardrails
Do not modify Admin V3, backups, Academy, Radio, TV, Marketplace, or other projects. No server deployment, cloud billing or live audio collection without explicit approval. Maintain the one-change -> test -> commit -> new-working-version process.
