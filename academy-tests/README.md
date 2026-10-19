# Academy Synthetic LMS Contract Tests — V1

Status: isolated design validation; NOT production authorization.

Run locally from the repository root with Node.js (no packages or internet required):

```sh
node academy-tests/check-synthetic-contract.cjs
```

Expected: 17/17 synthetic contract checks passed (when fixture and code remain consistent).

## Coverage
- Eight stable program slugs and eight schools.
- School/program relationship integrity and duplicate prevention.
- Nine locale objects and required text fields (synthetic placeholder content, NOT production translations).
- No enrollment or credential activation for planned previews.
- Learner record isolation, denial of enrollment into draft courses, cross-learner enrollment denial, instructor self-approval prohibition, publication review gates, credential server-role requirements.

## Negative-test coverage
The suite now includes seven additional checks: duplicate program identity, orphan school reference, missing Chinese locale, blank Arabic learning outcome, active enrollment in a draft course, credential issuance without assessment success, and a clean-fixture control. Mutations operate on in-memory copies of synthetic data only.

## Important limitations
- Tests evaluate an illustrative `authorize()` policy function, NOT actual database RLS, Supabase, real auth, or production API behavior.
- These fixtures contain fabricated identities and placeholder content only.
- The existence of this test file does not prove it has been executed in CI.
- For future staging, add schema validators, negative security tests, translation checks against live Academy files, accessibility tests and rollback rehearsal.

## Protected boundaries
Do not alter Admin V3, shared authentication, shared database, storage, footer, i18n, or any production Academy page as part of these synthetic tests.
