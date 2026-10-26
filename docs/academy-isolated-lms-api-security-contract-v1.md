# Echoes Academy — Isolated LMS API & Threat Model (Design V1)

Date: 2026-10-26
Status: DESIGN ONLY. No endpoint is deployed or connected to real users, authentication, storage or databases.
Dependencies: `docs/academy-isolated-lms-data-contract-v1.md`, `docs/academy-synthetic-lms-service-ci-acceptance-v1.md`.

## Isolation and invariants
- Future API prefix `/academy-api/v1` is illustrative and MUST NOT be added to the public GitHub Pages site as a working backend.
- Backend and identity environment must be independently approved before staging. Do not reuse production Supabase service keys, production JWT secrets, shared admin sessions, or privileged database roles.
- All responses default to `Cache-Control: no-store` when learner-related. Public catalog may be cached with a versioned revision.
- Internal IDs are opaque UUIDs. Existing public program slugs remain immutable. Never use slugs as authorization boundaries.
- The browser is untrusted. Authentication, authorization, completion and credential decisions must be server-side.
- Deny by default. Record auditable authorization decisions without leaking sensitive case or learner data.

## Proposed endpoint contract
| Method | Path | Access | Response / constraint |
| --- | --- | --- | --- |
| GET | `/catalog/programs?lang=en` | Public | Only approved previews and published catalog; no private fields |
| GET | `/catalog/programs/{slug}?lang=en` | Public | Approved public program revision; clear planned vs available status |
| GET | `/catalog/programs/{slug}/modules?lang=en` | Public | Approved outline only, not unpublished lesson bodies |
| GET | `/courses/{courseId}/lessons` | Enrolled learner / scoped instructor | Published immutable course revision, permitted lesson metadata |
| GET | `/me/enrollments` | Authenticated learner | Own records only; no arbitrary learnerId parameter |
| POST | `/courses/{courseId}/enrollments` | Authenticated learner | Server resolves actor ID; published revision, age/guardian and policy gates |
| GET | `/me/progress/{lessonId}` | Authenticated learner | Own enrollment and lesson scope only |
| PUT | `/me/progress/{lessonId}` | Authenticated learner | Idempotent state update; cannot independently assert course completion |
| POST | `/authoring/courses/{courseId}/revisions` | Assigned instructor | Draft only; version check; author cannot approve own revision |
| POST | `/reviews/{revisionId}/decision` | Independently assigned reviewer | Scoped review; safeguarding approval separate where required |
| POST | `/publishing/{revisionId}` | Scoped publisher | All required review gates verified on server |
| POST | `/credentials/{courseRevisionId}/issue` | Internal credential service only | Server-derived verified completion and assessment; idempotent issuance |
| POST | `/credentials/{credentialId}/revoke` | Authorized credential administrator | Audit, revocation reason and verification state |
| GET | `/verify/{opaqueCode}` | Public with rate limit | Minimal validity/issuer/course data only; no sensitive learner data |
| POST | `/safeguarding/reports` | Authorized reporting flow | Segregated intake, abuse prevention, no case data in public response |

## Standard responses
- Success: `{ "data": { ... }, "meta": { "requestId": "...", "revision": 1, "language": "en" } }`.
- Failure: `{ "error": { "code": "forbidden", "message": "Access denied", "requestId": "..." } }`.
- Use HTTP 400 malformed input, 401 unauthenticated, 403 forbidden, 404 not found or deliberately masked unauthorized resources, 409 revision conflict, 422 failed domain rules, 429 rate limit, 500 unexpected failure.
- Do not reveal whether a private learner, restricted case or credential exists in unauthorized responses.
- For state-changing calls require request validation, scoped authorization, CSRF mitigation where cookie auth is used, replay/idempotency handling and audit records.

## Role enforcement
- Public: published and approved public information only.
- Learner: own enrollment/progress only; no instructor, publisher, admin or credential powers.
- Instructor: assigned draft authoring; no self-approval and no unrestricted learner lists.
- Subject reviewer: independently assigned reviews only.
- Safeguarding reviewer: distinct approval; case access only by assignment and need-to-know.
- Publisher: cannot bypass independent reviews.
- Credential service: non-browser machine principal, minimal issuance scope; requires verified course revision and assessment evidence.
- Operations: bounded reports; no default access to sensitive safeguarding records.

## Threats, mitigations and tests
| Threat | Control | Required negative test |
| --- | --- | --- |
| IDOR / cross-learner access | Server-derived actor identity and row-level scope | Learner B cannot read/update learner A's records |
| Instructor self-approval | Independent reviewer identity and assignment | Author's own review rejected |
| Draft enrollment | Published immutable revision gate | Draft/planned course enrollment rejected |
| Forged progress or credential | Server-verified assessment/completion, internal issuance | Client-supplied completion or credential rejected |
| Translation spoofing | Whitelisted locale codes and approved revision state | Missing/unreviewed locale never silently published |
| Replay/duplicate issuance | Idempotency key, unique issuance constraints | Repeated issue request produces one credential |
| Stored XSS via lesson content | Structured text, sanitizer, CSP, media review | HTML/script payload rejected or neutralized |
| Excessive data exposure | Field allowlists, restricted case store, log redaction | Private fields absent from public responses |
| Abuse/report leakage | Separate access controls and retention | Generic instructor cannot access safeguarding case |
| Enumeration / brute force | Rate limiting, opaque codes, non-revealing errors | Repeated verify and login attempts throttled |
| Revision race | Optimistic concurrency / revision precondition | Stale revision publish/update rejected |
| Token theft | Short-lived scoped tokens, rotation, audit | Expired/wrong-audience token rejected |
| Minor safety risks | Age and guardian gates, safe contact defaults | Underage enrollment without required consent rejected |
| Service outage | Backups, incident plan, fail-closed authorization | Dependency failure never grants access |

## Privacy, accessibility and operational gates
- Establish lawful basis, consent/guardian rules, age restrictions, data residency, retention and deletion policy before collecting data.
- Keep private learner data and safeguarding cases out of GitHub and analytics.
- Provide accessible captions/transcripts, keyboard navigation and RTL testing for Arabic.
- Define content rights and independent review for child-protection training before publication.
- Do not imply external accreditation or guaranteed income/employment.
- Security review must include rate limits, dependency scanning, threat modeling, abuse cases, recovery and rollback rehearsal.

## Non-production prototype policy
The existing `academy-tests/synthetic-lms-service.cjs` is a local, in-memory simulation, NOT an HTTP service, identity provider or security boundary. Its client-supplied synthetic actors are only useful for deterministic tests; they must never be trusted in real API handlers.

## Staging approval gates
1. Approve independent hosting, isolated auth and storage architecture.
2. Approve jurisdiction-specific privacy and safeguarding rules.
3. Build contract-based mock API tests with synthetic fixtures.
4. Threat-model all endpoints and test deny-by-default access.
5. Review implementation of database authorization/RLS in isolated staging.
6. Test abuse, recovery, audit trails and rollback.
7. Obtain explicit separate approval before any production deployment or real learner processing.
