# Echoes Academy — Isolated LMS Domain & Data Contract (Draft V1)
Date: 2026-10-19
Status: DESIGN ONLY — no migration, database, authentication, enrollment or credential service deployed.
Depends on: `docs/academy-isolated-lms-architecture-v1.md` and `docs/academy-campus-program-preview-stable-baseline-v1.md`.

## Immutable boundaries
All Academy backend entities below are *proposals*. Do not create tables, buckets, RLS policies, service roles, edge functions or real learner accounts without a separate implementation authorization. No changes to Admin V3, admin, admin-v2, shared Supabase/auth, shared i18n, portal components, archives or backups. The current nine-language preview must continue working.

## Entity design (proposed isolated Academy namespace)
Use UUID internal IDs, immutable public slugs, timestamps in UTC, and explicit version numbers. Every user-linked record is private by default. No personal data in GitHub.
- `academy_school(id,slug,status,sort_order,created_at,updated_at)`
- `academy_program(id,school_id,slug,format,audience_band,min_age_policy,safeguarding_tier,status,current_revision_id,created_at,updated_at)`
- `academy_program_revision(id,program_id,revision,review_state,created_by,approved_by,approved_at,published_at)`
- `academy_program_locale(revision_id,language,title,audience,description,learning_outcomes_json,module_outline_json,review_state)`
- `academy_course(id,program_id,slug,status,current_revision_id)`
- `academy_course_revision(id,course_id,revision,language_source,learning_objectives_json,accessibility_review,subject_review,created_at)`
- `academy_module(id,course_revision_id,stable_key,position,status)`
- `academy_module_locale(module_id,language,title,summary)`
- `academy_lesson(id,module_id,stable_key,position,lesson_type,media_asset_id,status)`
- `academy_lesson_locale(lesson_id,language,title,body_ref,caption_ref,transcript_ref)`
- `academy_media_asset(id,storage_ref,mime_type,rights_status,caption_status,accessibility_status,review_state)`
- `academy_role_assignment(id,principal_id,role,scope_type,scope_id,granted_by,expires_at)`
- `academy_enrollment(id,learner_id,course_revision_id,status,created_at,completed_at)`
- `academy_lesson_progress(id,enrollment_id,lesson_id,state,updated_at)`
- `academy_assessment(id,course_revision_id,revision,passing_rule_json,review_state)`
- `academy_assessment_attempt(id,assessment_id,enrollment_id,score,result,created_at)`
- `academy_credential(id,learner_id,course_revision_id,issued_at,revoked_at,verification_digest)`
- `academy_review_event(id,entity_type,entity_id,revision_id,reviewer_id,decision,reason_code,created_at)`
- `academy_audit_event(id,actor_id,action,entity_type,entity_id,occurred_at,request_id)`
- `academy_safeguarding_case(id,restricted_reference,status,assigned_specialist_id,created_at)` — separately restricted store and retention policy; never exposed to public catalog or generic instructor roles.

## Public stable identifiers
School slugs, in catalog order:
1. `human-dignity-protection`
2. `entrepreneurship-economic-empowerment`
3. `media-arts-storytelling`
4. `youth-future-skills`
5. `creative-economy-craftsmanship`
6. `technology-responsible-innovation`
7. `peace-social-impact`
8. `lifelong-learning-personal-growth`

Program slugs, in existing Campus order (DO NOT rename existing preview links):
1. `art-of-being-human`
2. `conscious-parenting-child-safeguarding`
3. `creativity-economic-opportunity`
4. `young-creators-future-media`
5. `financial-literacy-everyday-life`
6. `responsible-ai-digital-safety`
7. `peaceful-dialogue-community-action`
8. `communication-across-cultures`

## Allowed lifecycle
- Program/course content: `draft -> in_review -> approved -> published -> archived`.
- Rejected content returns to `draft` as a new revision; do not silently mutate approved revisions.
- Translation lifecycle is independent: `missing -> draft -> reviewed -> approved`.
- Public publication requires source-language approval, required language checks, subject-matter review, accessibility review and safeguarding sign-off for applicable tiers.
- Catalog preview status `planned` is NOT equivalent to published course availability.
- Enrollment may reference only a published, immutable course revision, never a mutable draft.

## Locale contract
- Required codes: `en,tr,es,fr,de,pt,ru,ar,zh`.
- Required public program fields per locale: `title,audience,description,learning_outcomes[3],module_outline[3]`.
- Enforce arrays of three non-empty strings for the current eight pilot previews; future courses may define versioned schema-specific counts.
- Text must be plain text by default; no unsanitized HTML. Keep right-to-left layout metadata independent of translated text.
- A missing locale may fall back visibly to English only for preview pages, not for a course falsely advertised as translated.
- Preserve stable IDs across locales. Translation must never change the program's identity, school, age restrictions, permissions or certificate rules.

## Roles and permissions (deny by default)
- Public visitor: read approved public preview/published catalog only.
- Learner: access own enrollment, progress and permitted lessons only.
- Instructor: author assigned courses; cannot self-approve, view unrelated learner records or issue credentials.
- Subject reviewer: review assigned subject matter; cannot publish alone.
- Safeguarding reviewer: approve applicable protection checks; access to restricted cases only if explicitly assigned.
- Academy publisher: publish only after required independent approvals.
- Academy operations: scoped operational reports; no unrestricted sensitive case access.
- Credential service: server-only issuance/revocation after verified completion; never browser-issued.
All authorization must be server-enforced with explicit tenant/scope checks and auditable decisions.

## Privacy and child protection
- Collect minimum data; determine lawful basis, consent and retention before implementation.
- For minors, define age gates, guardian consent where legally required, safe communication defaults, reporting routes, moderation and specialist escalation.
- Do not publicly expose learner identities, safeguarding case details, assessment attempts or raw certificate tokens.
- Avoid public leaderboards for empathy, dignity, morality or other sensitive personal qualities.
- Store videos outside GitHub with rights checks, accessible captions/transcripts and signed delivery where needed.
- Avoid income, employment, accreditation or professional licensing promises.

## Credentials (future-only)
A certificate must be issued by an authenticated server-side service after verified completion and approved assessment, with minimal public verification and revocation support. A course preview cannot issue a certificate. Distinguish participation, completion and assessed achievement; never imply external accreditation without documented authority.

## Migration gates
1. Freeze current Academy preview and record working nine-language smoke tests.
2. Validate the proposed JSON schema with synthetic, non-identifying fixtures only.
3. Complete security, privacy, safeguarding and accessibility reviews.
4. Obtain separate approval for backend environment and identity boundaries.
5. Design and test RLS/authorization against cross-user and cross-role access.
6. Deploy isolated staging; test failure recovery, revocation, data deletion and audit trails.
7. Require explicit production launch approval and rollback plan.

## Open design decisions (not assumed)
- Hosting and database choice for isolated Academy staging.
- Legal jurisdiction, age/guardian consent requirements and retention schedules.
- Independent expert review and safeguarding escalation ownership.
- Credential issuer identity, verification domain and issuance criteria.
- Translation governance, fallback policy for learner-facing lessons and release automation.

## Acceptance criteria for this design artifact
- Existing eight public program slugs are preserved.
- Nine-language locale fields and publication gates are defined.
- No backend changes or real data processing occur.
- All protected portal systems remain untouched.
