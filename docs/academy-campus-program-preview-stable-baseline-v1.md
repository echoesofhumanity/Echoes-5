# Echoes Academy — Stable Nine-Language Campus & Program Preview Baseline (V1)

Date: 2026-10-19
Repository: echoesofhumanity/Echoes-5
Branch: main
Status: USER-TESTED PREVIEW BASELINE; NOT A LIVE LMS.

## Scope and user acceptance
- Academy Campus presents eight planned schools and eight planned pilot programs.
- Eight program detail previews are linked from Campus by stable program slugs.
- Supported languages: en, tr, es, fr, de, pt, ru, ar, zh (Simplified Chinese).
- Program titles, audiences, descriptions, section headings, proposed learning outcomes and indicative modules are localized across these languages.
- Shared footer translations on program detail pages were restored by adding `locales/en/pages/academy-program.json` as the base dictionary.
- Arabic uses the existing shared RTL direction handling.
- Program detail typography and cinematic cards were centered and refined for mobile.
- Academy Campus program links carry release marker `academy-detail-i18n-v9-20261019`; detail-to-campus back links carry the same marker.
- Program detail locale JSON fetches use `cache: 'no-store'`.
- User confirmed successful manual checks of language switching, including Russian, Arabic, Chinese, footer, and versioned Campus-to-detail navigation.
- This is manual acceptance, not an automated cross-browser, accessibility, performance or security certification.

## Source of truth
- `academy-campus.html` — school/program catalog, search/filter and program preview links.
- `academy-program.html` — detail preview, outcomes/modules, localized labels, mobile presentation.
- `locales/{language}/pages/academy-campus.json` — Academy catalog translations; some language content is also bundled inline for synchronous rendering.
- `locales/en/pages/academy-program.json` — base file allowing the existing shared i18n translator to process header/footer on the program preview page.
- Existing shared `assets/js/i18n.js`, `assets/js/navigation.js`, and footer component remain outside Academy change scope.

## Release discipline
1. Keep working pages and shared navigation intact.
2. When editing program detail content, change the Academy release marker in BOTH Academy pages, so catalog-to-detail navigation requests the latest HTML.
3. Confirm all eight program slugs remain stable and resolve to the intended program.
4. Verify nine language choices; test switching without reloading and after a fresh load.
5. Check program title, audience, description, outcomes, modules, disclaimer, footer and RTL.
6. Check search/filter and mobile card alignment.
7. Keep a user-visible preview disclaimer: no real enrollment, lessons, assessments, issued certificates or learner accounts.
8. Distinguish GitHub commit success from deployment and user/browser testing.

## Explicit non-goals and protected boundaries
- This release does not activate a learner portal, LMS backend, video lessons, payment, enrollment, credential verification or certificates.
- Do not modify `admin-v3/**`, `admin/**`, `admin-v2/**`, clones, archives or backups.
- Do not change shared Supabase/auth/RLS, shared language engine, shared header/footer, or unrelated portal modules without separate authorization.
- The header logo placeholder must remain blank.
- No accreditation, professional license, income or employment guarantees are implied.

## Next approved design track (not yet implemented)
- Prepare a versioned Academy-owned course data contract with stable IDs, locale schemas, review states, safeguarding and accessibility metadata.
- Review course preview text with subject-matter experts before any public instructional release.
- Plan isolated learner/faculty/operations architecture and its permissions; implementation requires separate approval.
- Apply the successful Academy localization pattern to other portal modules only after independent inventory and approval.

## Known limitations
- Locale data is partly duplicated between inline content and JSON; refactor only with explicit regression tests.
- Release marker updates are currently manual, not an automated build process.
- Automated end-to-end tests and accessibility audit remain outstanding.
