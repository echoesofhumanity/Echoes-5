# Echoes Governance — CT2 secure meeting bridge readiness (14 Nov 2026)

Status: IMPLEMENTATION CONTRACT / NOT LIVE AUDIO OR MEETING INTEGRATION.
Scope: Echoes-5 main, governance only. Do not change Admin V3, backups, Oracle, Radio, TV, Academy, Marketplace, or JaaS meeting baseline.

## Verified implementation
- CT2 Render Free service: https://echoes-governance-ct2.onrender.com ; /health returns ready (user mobile confirmed).
- Commit 74dd0047: startup synthetic Turkish-to-English inference; Render log CT2_SELFTEST passed and deployment Live.
- POST /translate currently accepts TR->EN text, authenticates with private X-API-Key; no browser CORS and no participant logging. No authenticated public meeting bridge yet.
- Existing governance-center-jaas-v11b.html starts a JitsiMeetExternalAPI 8x8.vc iframe on button click; it uses prewritten captions, not STT. No transcriptionChunkReceived listener or supported remote audio ingress is present.

## Trust boundaries and implementation sequence
1. Identity and authorization first: private backend verifies a short-lived meeting-bound participant session and consent. Public GitHub Pages client never receives CT2 API keys or provider secrets. No client-supplied meetingId or role is authoritative.
2. Speech ingress separately: use authorized transcription provider or consented local microphone STT; do not assume host JS can read other participants audio from cross-origin JaaS iframe. Never activate microphone automatically.
3. Backend proxy: authenticated POST /governance/captions/translate with sourceLang=tr, targetLang=en, text (max 1200 chars), segmentId, meeting session and ephemeral timestamps. Backend validates entitlement, meeting, consent, origin, size and rate limits; forwards to CT2 /translate with server-held X-API-Key. Reject unsupported pairs and redact transcript content from logs.
4. Delivery: authorized, short-lived meeting-scoped WebSocket or SSE for caption segments, no unauthenticated public stream. Browser receives segmentId, speakerId, sourceLang, targetLang, translatedText, startMs, endMs, isFinal. No localStorage transcripts. Visible automatic-translation notice.
5. Presentation: captions within video stage; bottom safe strip when JaaS iframe does not expose stable speaker tile coordinates. Never claim speaker anchoring without evidence.
6. Graceful fallback: when sleeping, unavailable, unauthorized or slow, show Translation unavailable without replacing original audio or exposing secrets. Never substitute synthetic captions as real.

## Acceptance gates
- Authenticate/deny anonymous requests, replay, expiry, CSRF/origin, cross-meeting isolation, rate limits and bounds.
- Actual external authenticated /translate call through private server; measure Render Free cold/warm response. Startup self-test alone is not an external API test.
- Two consented devices: TR speech -> STT -> CT2 -> near-video caption; measure delay and accuracy, overlapping speech, interruptions and reconnects.
- Confirm provider quotas/cost before 25-person or five-language claims. Only TR->EN implemented; reverse and RU/ES/DE not implemented.

## Hold
Do not wire JaaS page directly to /translate. No verified identity provider, meeting-scoped authorization broker, or live STT. This document prepares integration without an insecure public relay or modifying the accepted meeting pilot.
