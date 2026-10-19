# Echoes Academy — Isolated In-Memory LMS Prototype V1
Date: 2026-10-19
Status: SYNTHETIC TEST PROTOTYPE ONLY — NOT DEPLOYED AS A SERVICE

## Files
- `academy-tests/lms-prototype.cjs`: in-memory interface.
- `academy-tests/check-lms-prototype.cjs`: 15 offline tests.
- `academy-tests/fixtures/lms-synthetic-v1.json`: planned programs and fabricated roles.
- `academy-tests/fixtures/instructional-content-synthetic-v1.json`: one draft module/lesson in nine placeholder locales.

## Supported prototype operations
- `catalog(language)`: list eight planned program previews in one of nine languages.
- `course(programSlug,language)`: read the single synthetic lesson/module outline or an empty planned program.
- `simulateProgress(actor,programSlug,lessonKey)`: update ephemeral progress for an explicitly recognized synthetic learner.
- `getProgress(actor,learnerId)`: only the same recognized synthetic learner may read their own ephemeral progress.
- `enroll()` and `issueCredential()`: always deny.

## Critical boundaries
- No HTTP server, deployed endpoint, API token, production auth, real database, storage, payment, registration, certificate or personal information.
- In-memory progress is lost when a new prototype instance is created.
- `actor` objects are fabricated inputs; checking a role string and fixture ID is NOT secure production authentication. Never reuse this authorization function as a live API gate.
- All localized lesson/module text is explicitly marked synthetic and is not publishable instruction.
- No edits to Academy Campus/program HTML, shared portal systems, Admin V3, Supabase, RLS, header/footer or the blank header logo placeholder.

## Verification
Run locally from repository root with Node.js 22:
```sh
node academy-tests/check-synthetic-contract.cjs
node academy-tests/check-instructional-content.cjs
node academy-tests/check-lms-prototype.cjs
```
The workflow `.github/workflows/academy-synthetic-contract.yml` runs all three scripts on relevant commits. Expected checks: 17 + 10 + 15 = 42. CI results must be confirmed separately; file creation is not proof of passing tests.

## Next gate
Only after CI succeeds: design a separately approved isolated staging adapter with threat model, verified authentication and server-side authorization, data retention and safeguarding controls. Do not connect to production without explicit permission.
