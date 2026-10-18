# Echoes Academy — Nine-Language Campus Baseline and Reuse Contract (V1)
Status: Academy catalog preview baseline; not a production LMS.
Date: 2026-10-19
Repository: echoesofhumanity/Echoes-5; main.

## Verified scope
- Academy Campus has eight schools and eight planned pilot programs.
- Active portal languages: English (en), Turkish (tr), Spanish (es), French (fr), German (de), Portuguese (pt), Russian (ru), Arabic (ar), Simplified Chinese (zh).
- The user reported successful visual language-switch tests, including Arabic RTL and Chinese.
- These reports are manual checks, not a substitute for automated regression or accessibility tests.
- Enrollment, real lessons, assessments, certificate issuance, payment, learner accounts and backend are NOT implemented or enabled.

## Existing implementation
- Academy page: `academy-campus.html`.
- Academy page dictionaries: `locales/{lang}/pages/academy-campus.json`.
- English/Turkish content is embedded in the page; Spanish uses the Academy JSON dictionary; French, German, Portuguese, Russian, Arabic and Chinese are additionally bundled in the page for reliable immediate switching.
- The shared portal language selector calls `EchoesI18n.setLanguage()`; the Campus listens for `echoes:language-change`.
- Locale requests have a stale-request guard. The page falls back to English if a non-bundled dictionary is missing or incomplete.
- Switching language clears the old-language search query. Search and program type filters work on the active catalog.
- The shared i18n engine loads per-page `locales/{lang}/pages/academy-campus.json` and shared header/footer dictionaries. It is not to be modified as part of Academy work.
- Arabic direction is provided by the existing global i18n document direction mechanism; future visual changes should be Academy-scoped.

## Reuse throughout the portal — future proposal, NOT authorized deployment
1. Inventory each portal page, module, text source, locale and direction behavior.
2. Freeze current working page behavior and capture screenshots / manual baselines.
3. Define a per-module translation schema with stable keys, required fields and English fallback.
4. Separate translated content from layout and behavior; avoid growing inline translation bundles in new modules.
5. Validate each locale dictionary (required keys, item counts, HTML safety, link targets).
6. Provide per-module RTL checks, mobile overflow tests, search/filter behavior and accessible language announcements.
7. Migrate ONE isolated module at a time only after explicit approval and regression testing.
8. Do not alter shared i18n, shared header/footer, Admin V3, or any unrelated module as a side effect.

## Academy next phase: course-detail PREVIEW only
- Give each planned program a stable public slug/ID without changing its intended school or type.
- Add a course/program detail preview with audience, intended learning outcomes, indicative modules, safeguarding notes and a clear NOT OPEN disclaimer.
- Keep all navigation inside Academy-owned files; no account, enrollment or certificate actions.
- Prepare a versioned data contract before moving catalog data to a backend.
- Require explicit separate approval before enabling authentication, storage, assessments, instructor access or certificate issuance.

## Guardrails
- Do not modify `admin-v3/**`, `admin/**`, `admin-v2/**`, archives, clones or backups.
- Do not modify shared Supabase, auth, RLS, portal-wide navigation/i18n or other sections.
- Keep the header logo placeholder EMPTY until the actual logo is supplied.
- No fabricated course availability, certification, accreditation, employment or earnings claims.
- Roll out in small Academy-owned commits; record user-tested results and distinguish them from automated tests.
