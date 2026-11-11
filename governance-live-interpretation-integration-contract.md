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

## Five-language implementation decision — 2026-11-11
- **Scope fixed:** TR, EN, RU, ES, DE for live captions and eventual optional spoken translation. The nine-language portal UI remains unchanged.
- **Verified vendor path:** JaaS officially documents built-in live transcription and text translation. Prioritize this supported path over building a custom remote-audio capture pipeline. Official references: https://developer.8x8.com/jaas/docs/transcription-translation/ and https://developer.8x8.com/jaas/docs/tutorial-using-transcription-chunks/.
- **Activation gate:** JaaS transcription/translation are paid add-ons requiring billing/payment setup and a meeting JWT with `features.transcription=true`. No activation, card entry, billing or token generation has been authorized or performed.
- **Supported integration:** JaaS documents the IFrame `transcriptionChunkReceived` event and `setSubtitles` command; actual availability in the Echoes tenant and behavior on Android must be tested. The built-in subtitle UI may already handle placement and target-language selection. Do not confuse this with synthesized speech.
- **Provider caution:** JaaS FAQ warns that changing the transcription source language mid-session may be unreliable; test language switches and multi-speaker meetings before promising arbitrary five-way simultaneous interpretation. Confirm supported source/target language codes in the actual tenant.
- **TTS is a separate phase:** Built-in live translated text does not establish live dubbed audio. Choose and cost a TTS service only after caption acceptance; avoid echo, audio retransmission, and exposing secrets in static GitHub Pages.
- **Next safe step:** Inspect the existing JaaS initialization and prepare a non-billing, non-audio-capturing capability/readiness check, then user-led provider-account confirmation. Do not replace synthetic captions with a claim of real translation before activation and measured testing.

## Azure TTS voice selection — 2026-11-11
- User auditioned and accepted two Turkish voices in Microsoft's voice gallery: **Ahmet (male)** and **Emel (female)**.
- Microsoft's current official Speech voice catalogue lists the standard Neural voice identifiers `tr-TR-AhmetNeural` and `tr-TR-EmelNeural`. Reference: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=text-to-speech
- These are **distinct voice models**, not browser pitch-shift presets. Do not confuse with `tr-TR-Aydın:MAI-Voice-2-Flash` or `tr-TR-Elif:MAI-Voice-2-Flash`.
- Device browser speechSynthesis exposed no selectable Turkish voices. Pitch-shift voice 1/2 audition failed user acceptance. The previously accepted single-voice browser TTS was restored as fallback.
- Integration gate: verify Azure subscription, Speech resource region, supported REST/SDK voice IDs, quota, pricing and authentication before making requests. No account creation or paid activation was performed.
- Security requirement: do not put Azure subscription keys, tokens or service credentials into static GitHub Pages code. Use a secure server-side token broker and explicit cost cap before any real Azure synthesis.
- After Turkish two-voice live API acceptance, confirm separate male/female standard Neural voices for EN/RU/ES/DE. Do not promise voice identity across languages without auditioning.

## Capacity and cost worksheet — planning assumptions, not measured usage
- Target: 25 council participants; 5 selectable output languages; 2 voice characters per language. The 25-person target does **not** establish that 25 participants are eligible under the JaaS Dev plan's 25 monthly-active-user limit.
- One meeting, 120 minutes, assumed speech density 600–1,000 source characters per minute: **72,000–120,000 source characters** to transcribe/translate. This is a planning estimate, not a provider billing quantity.
- If every translated segment is synthesized **once per selected target language**, with 5 target languages active and approximately equal character counts: **360,000–600,000 synthesized characters** per 2-hour meeting. If only 2 target languages are requested: **144,000–240,000**. In practice translation length varies.
- If each of 25 listeners independently requests a new synthesis of every segment instead of sharing/caching language-and-voice output, consumption could approach **1.8–3.0 million synthesized characters** for a 2-hour meeting (25 × 72,000–120,000). This is an intentionally pessimistic upper planning scenario, not a price quotation.
- With 2 voice characters and 5 target languages, at most **10 distinct language+voice outputs** per source segment are needed if all combinations are requested. Generate on demand, cache each segment by meeting/segment/target-language/voice and reuse within the meeting. Never cache private speech beyond the approved retention period.
- Even the shared-output 5-language scenario can exceed a cited 500,000-character monthly F0 allowance in a single long meeting. The free tier is **not** a production capacity guarantee. Check current F0 quota, per-minute/request limits, regional support, actual voice availability and applicable billing at implementation time.
- Streaming pipeline must account for overlapping speech, interim text revisions, audio playback queues, late joins, interruptions, 5-language translation cost, STT cost and JaaS meeting charges. Never infer TTS cost from the JaaS plan price.
- For mobile playback, browser gesture/autoplay policies and echo prevention require a user-initiated 'enable translated audio' control and local mute/volume. Do not rebroadcast synthesized audio to the JaaS microphone.
- Proposed security boundary: GitHub Pages renders the client; an authenticated service validates meeting/participant entitlement and issues narrowly scoped temporary credentials or proxies synthesis. Secrets, provider keys and participant audio stay off public GitHub.
- Release gates: (1) synthetic 5-language control UI (2) secured provider trial with spending cap (3) 2-device TR↔EN caption latency and TTS quality test (4) 5-language audition and quality tests (5) 25-participant capacity/load test. No production activation before gates pass.
