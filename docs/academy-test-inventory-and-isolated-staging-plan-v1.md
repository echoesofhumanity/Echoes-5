# Echoes Academy — Test Inventory & Isolated Staging Plan V1

Date: 2026-10-26
Repository: echoesofhumanity/Echoes-5
Branch: main
Status: DOCUMENTATION / PLANNING ONLY. No staging infrastructure or production change.

## Verified workflow inventory
The current `.github/workflows/academy-synthetic-contract.yml` invokes these six scripts (Node.js 22):

| Test file | Declared test() cases | Purpose |
| --- | ---: | --- |
| `academy-tests/check-synthetic-contract.cjs` | 17 | Domain and negative fixture constraints |
| `academy-tests/check-instructional-content.cjs` | 10 | Synthetic lesson/module schema and invalid cases |
| `academy-tests/check-synthetic-service.cjs` | 15 | In-memory service, localized catalog and progress isolation |
| `academy-tests/check-lms-prototype.cjs` | 15 | Separate in-memory LMS prototype behavior |
| `academy-tests/check-offline-service.cjs` | 15 | Separate offline service and lesson completion behavior |
| `academy-tests/check-synthetic-http-contract.cjs` | 18 | Offline HTTP request/response semantics and access denials |
| **Total** | **90** | **Defined test cases, not 90 unique security properties** |

The project owner provided a screenshot showing workflow run #18 green on the latest HTTP-contract workflow commit. Individual assertion log lines have not been separately inspected.

## Overlap and recommended consolidation
Three separate implementations currently model similar catalog/progress functionality:
- `academy-tests/synthetic-lms-service.cjs` (used by service and HTTP contract checks)
- `academy-tests/lms-prototype.cjs` (used by the earlier prototype checks)
- `academy-tests/prototype/offline-lms-service.cjs` (used by offline service checks)

These are **test-only parallel prototypes**, not three production systems. Do not delete them or combine APIs without a controlled comparison and regression tests. Recommended future direction: treat `synthetic-lms-service.cjs` as the candidate reference domain service because the HTTP contract simulator already uses it; preserve the other two as comparison tests until equivalent behaviors are mapped and CI stays green. This is a proposal, not a migration.

## Gaps
- No real authentication, authorization middleware, database RLS or HTTP server security tests.
- No browser end-to-end, accessibility, load, data retention, recovery or minor consent verification.
- No staging environment, monitoring, secrets policy or real certificate service.
- Fixture-only authorization must not be promoted into production as an identity boundary.
- Current count is test case count, not independent coverage count.

## Isolated staging architecture (proposed, not deployed)
1. Dedicated Academy-only staging environment with separate database, credentials, storage and identity provider; no connection to production portal services.
2. Server-side API adapter implementing the reviewed `docs/academy-isolated-lms-api-security-contract-v1.md` with deny-by-default middleware, identity verification, scoped permissions and audit events.
3. Synthetic seed data only; no real students, guardians, case records, credentials or payment details.
4. Private network/secrets configuration; least-privilege CI and disposable staging deployments.
5. Automated integration tests for IDOR, self-approval, age/guardian gates, credential forgery, replay, XSS, revision races, revocation, data deletion and fail-closed behavior.
6. Independent safeguarding, privacy, accessibility and security review before any pilot with real people.
7. Explicit approval required for staging provisioning and a separate explicit approval for any production connection.

## Protected boundaries
No changes to live Academy pages, shared Supabase/auth/RLS, Admin V3, admin-v2, archives, clones, backups, header/footer, shared i18n, or the blank logo placeholder. Do not inspect protected folders.

## Next safe task
Build an Academy-owned test coverage matrix mapping each of the 90 existing cases to requirements and classify duplicated vs unique behaviors. Add synthetic-only adversarial cases to the candidate reference service; no deployment.
