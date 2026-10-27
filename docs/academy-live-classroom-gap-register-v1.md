# Echoes Academy — Interactive Live Classroom Gap Register (V1)

Status: planning and synthetic demonstration; NOT a functioning live classroom.
Scope: `academy-learning-lab.html` only for UI prototypes; existing Campus and Program pages untouched.

## Implemented and bounded
- Nine-language Learning Lab, Arabic RTL, shared portal language preference.
- Recorded-video placeholder with fullscreen; no real media.
- Reading and lesson previews; three synthetic practice questions with local feedback.
- Seminar card with live join **disabled**.
- Local hand-raise toggle in nine languages; **not** connected to an instructor, another user, meeting service or server. No webcam/microphone permission or persistent attendance.

## Missing before real interactive live teaching
| Priority | Capability | Acceptance criterion |
|---|---|---|
| P0 | Identity and role authorization | Real student, instructor and moderator roles verified server-side; no role escalation |
| P0 | Safeguarding and privacy | Child protection policy, reporting/escalation, consent, age-appropriate controls, restricted private contact, clear incident handling |
| P0 | Secure room admission | Authenticated enrollment, scheduled room IDs, waiting room, instructor admission, participant limits, expiry and revocation |
| P0 | Moderation | Instructor can mute/remove participants, lock room, handle raised hands and disruptive behavior; audit trail with appropriate privacy |
| P0 | Real-time transport | Select and independently verify a provider or self-hosted SFU for real audio/video, screen share, chat, reconnection and mobile compatibility |
| P0 | Zero-cost capacity proof | Confirm actual hosting, bandwidth, TURN relay, usage quotas, concurrency and operational ownership; free open-source software alone does not prove free service |
| P0 | Data protection and security | Retention, encryption, consent, access control, rate limiting, abuse prevention, incident response and applicable legal review |
| P1 | Class scheduling | Time zones, cancellations, capacity, instructor assignments and notifications |
| P1 | Accessibility | Captions, transcripts, keyboard/screen-reader navigation, low-bandwidth alternatives and Arabic RTL verification |
| P1 | Participation and learning | Live Q&A, hand queue synchronized across clients, polls, breakout rooms only if safe, moderated chat and meaningful feedback |
| P1 | Reliability and QA | Cross-device network tests, connection drops, poor connectivity, load, security tests and fail-closed admission |
| P2 | Optional recording | Disabled by default; separate explicit consent, storage, access and retention rules before any activation |
| P2 | Analytics and progress | Only with secure identities and minimal, justified data collection |

## Suggested build order (no production activation)
1. Test local interaction controls and multilingual UX on mobile.
2. Specify roles, state transitions, admission and moderation as synthetic offline contracts and tests.
3. Compare zero-cost-compatible real-time architectures **without provisioning** a service.
4. Prototype an instructor/student room with synthetic events and no personal data.
5. Security, safeguarding, accessibility and operating-cost review.
6. Only after explicit approval, plan real deployment and integrations.

## Design rule
Echoes cinematic navy/turquoise for identity and room framing; quiet neutral learning surfaces for content; video stage dark. Reuse portal card, button, motion and icon conventions after verifying actual styles. Respect reduced-motion settings. Visual design is NOT yet signed off.

## Protection rules
Echoes-5 main only. No Admin V3, backup/clone/archive preview or modifications. No changes to Supabase, shared navigation, Radio, TV, Marketplace or stable Campus/Program. No paid services, trial billing, real users, real sessions or recording.
