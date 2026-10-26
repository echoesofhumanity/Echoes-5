# Echoes Academy — Learning Environment & Integration Contract (V1)

Date: 2026-10-26
Status: DESIGN CONTRACT ONLY — no production LMS, no live class activation

## Existing architecture (verified on Echoes-5 main)
- `academy-campus.html`: eight schools and eight program previews; nine-language baseline.
- `academy-program.html`: program-detail previews, linked from Campus.
- `academy-learning-lab.html`: separate synthetic lesson demonstration, nine languages and shared `echoes.language` preference.
- `assets/js/i18n.js`: existing shared language preference, nine active languages, RTL Arabic.
- The Learning Lab currently links back to `index.html`; Campus does not yet link to the Learning Lab. This is an intentionally unresolved navigation gap, not an authorization to modify stable Campus.

## Pedagogical design
1. **Discover / Campus** — retain Echoes deep navy and turquoise for belonging, orientation and identity; avoid animated distraction during focused work.
2. **Understand / Program** — concise objectives, prerequisites, duration, accessibility and clear indication of preview versus real availability.
3. **Learn / Classroom** — soft light reading surfaces, comfortable text measure, adjustable typography and clear progress position; reduce extraneous cognitive load.
4. **Watch / Video** — dark neutral stage, true fullscreen with aspect ratio preserved, captions/transcripts when actual media is published; do not fake playback.
5. **Practice / Laboratory** — safe exploratory tasks, explanations and constructive feedback; errors must not shame learners.
6. **Meet / Seminar** — explicit consent, instructor moderation, accessible controls, waiting-room and safeguarding gates; no live provider or recording until independently approved.

Colors are design tools, not evidence that any particular hue itself increases learning outcomes. Test contrast, readability, motion preferences and learner comprehension rather than assuming psychological effects from color alone.

## Integration plan
- Keep the existing Academy Campus and Program pages as canonical navigation; no parallel Academy.
- First refine only the isolated Learning Lab, with an optional return to Campus and clear synthetic labels.
- Then add a deliberate, tested Campus/Program → Learning Lab preview entry point **only after separate approval** to modify stable pages.
- Reuse `EchoesI18n.getLanguage()/setLanguage()`, `echoes:language-change` and `echoes.language`. Avoid a competing language preference store.
- All nine languages must cover navigation, lesson descriptions, notes, safety text and action labels; verify Arabic RTL on mobile.
- Video files, actual PDFs, enrolment, identity, student progress and live conferencing remain unavailable until secure services exist.

## Zero-cost and safety constraints
- No paid services, trials requiring payment methods, third-party video provisioning, recording, accounts or real participant data.
- Do not modify or preview Admin V3, backups, clones, Supabase, Radio/TV, Marketplace, or shared portal navigation.
- Incremental work on Echoes-5 main; one change, test, commit. Keep existing stable pages intact until explicit authorization.
- Design must remain usable on mobile, keyboard accessible, and compatible with reduced-motion preferences.

## Acceptance gates
1. Learning Lab nine-language content and shared preference retained.
2. Video fullscreen and reading preview retained.
3. New light reading layout verified on mobile with sufficient contrast.
4. No live join, registration, real video, tracking or recording enabled.
5. Only after these checks, consider adding canonical navigation from stable Academy pages.
