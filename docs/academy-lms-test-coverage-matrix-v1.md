# Echoes Academy — 90-Test Coverage Matrix V1

Date: 2026-10-26
Status: Source-level audit; no test files modified.
Repository: echoesofhumanity/Echoes-5 (main)

## Exact test inventory

| Suite | Count | Domain focus |
| --- | ---: | --- |
| check-synthetic-contract.cjs | 17 | Identity, schools, locales, enrollment, approval, publication, credentials, negative mutations |
| check-instructional-content.cjs | 10 | Draft lesson/module schema, locale completeness, activation, relationships |
| check-synthetic-service.cjs | 15 | Catalog, localized module/lesson preview, ephemeral learner progress, disabled actions |
| check-lms-prototype.cjs | 15 | Independent catalog/course prototype, learner isolation, ephemeral state |
| check-offline-service.cjs | 15 | Independent offline lesson completion, idempotency, defensive copies and isolation |
| check-synthetic-http-contract.cjs | 18 | Request/response semantics, deny-by-default paths, invalid inputs, simulated identity |
| **Total** | **90** | **Number of test() declarations, not distinct properties** |

All six suites are referenced by `.github/workflows/academy-synthetic-contract.yml`. The user's GitHub Actions screenshot shows run #18 green. Source was read for this matrix; this audit did not independently execute tests or inspect individual CI log lines.

## Requirement coverage (D = direct, O = overlapping, — = not tested)

| Requirement | Contract 17 | Content 10 | Service 15 | Prototype 15 | Offline 15 | HTTP 18 | Assessment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Eight stable program identifiers | D | — | O | O | — | O | Covered in synthetic fixtures |
| Nine locales and required content | D | D | O | O | O | O | Shape covered; real translation quality not verified |
| School/module/lesson referential integrity | D | D | O | O | O | O | Fixture-only |
| Deny draft enrollment | D | D | O | O | O | O | Covered by model and disabled functions |
| Prevent self-approval / require reviews | D | — | — | — | — | — | Illustrative policy only |
| Protect credential issuance | D | D | O | O | O | O | Issuance disabled in prototypes |
| Separate learner progress | — | — | D | D | D | D | Fixture-actor isolation; not real auth |
| Reject unknown identity/role | D | — | O | D | D | D | Some paths depend on supplied actor object |
| Progress idempotency | — | — | — | — | D | — | Only offline prototype |
| Detached catalog response (no mutable leak) | — | — | — | — | D | — | Only offline prototype |
| HTTP method/path/locale/status codes | — | — | — | — | — | D | Offline simulation only |
| CSRF, verified tokens, session expiry | — | — | — | — | — | — | Not tested |
| Real database RLS / IDOR | — | — | — | — | — | — | Not tested |
| Revision concurrency, replay, rate limiting | — | — | — | — | — | — | Not tested |
| Safeguarding case access / guardian consent | O | O | — | — | — | — | Design rules only |
| Accessibility, RTL and captions | — | — | — | — | — | — | Not tested by these suites |
| Real credential revocation and verification | — | — | — | — | — | — | Not implemented |

## Overlap assessment

1. **High overlap:** program catalog and nine-language availability are checked by four or more suites.
2. **High overlap:** enrollment and credential operations are disabled in multiple prototypes. This is useful regression protection but does not validate issuance in a real backend.
3. **High overlap:** synthetic learner progress isolation is implemented separately in three domain prototypes and in the HTTP adapter.
4. **Distinct strengths:** the contract suite covers school/identity invariants and self-approval; the content suite covers lesson references; the offline suite covers idempotency and defensive copies; the HTTP suite covers response codes and unknown paths.
5. **Do not delete or merge yet:** three prototypes use different return contracts and state semantics. Uncontrolled consolidation would remove useful behavioral checks.

## Prioritized gaps and safe next actions

**P0 — next, synthetic only:** Add adversarial tests to the candidate `synthetic-lms-service.cjs` and its HTTP adapter for unknown synthetic learner IDs, forged role strings, invalid progress transitions, unsupported request body fields, and mutation of returned catalog objects. Ensure deny-by-default behavior. Test only in memory; do not imply secure real authentication.

**P1 — before isolated staging:** Define a mock server-side identity verifier, request schema validator, and immutable revision checks; model independent reviewer and safeguarding approval gates. These must not use real tokens or production services.

**P2 — isolated staging approval gate:** Build a separate authenticated backend with server-side authorization, RLS, privacy and guardian rules, rate limits, audit and retention. Obtain explicit approval before provisioning.

**P3 — before real learner launch:** Complete independent security, safeguarding, accessibility, translation, incident response, revocation and recovery reviews.

## Boundaries

Do not touch Admin V3, backups/clones, shared Supabase/auth, shared navigation/i18n, existing Academy live pages or the blank logo placeholder. This matrix does not authorize staging deployment, real user processing or certificate issuance.
