# Echoes Academy — Isolated LMS Architecture Contract (V1)
Status: design baseline; NOT a deployed learning management system.
Date: 2026-10-18
Scope: Echoes-5 main, Academy-owned paths only.

## Absolute protected boundaries
- Do not modify, delete, reconfigure, migrate, or write to `admin-v3/**`.
- Do not touch any backup, clone, archive, mirror, or other portal repository or deployment.
- Do not modify `admin/**` or `admin-v2/**`.
- Do not change shared authentication, shared Supabase tables, storage buckets, RLS, or other portal modules without separate explicit authorization.
- Read-only inspection of Admin V3 is permitted solely for future compatibility.
- Academy integrations with Admin V3 are deferred until explicitly approved.

## Product principles
- Humanity first: empathy, compassion, safeguarding, dignity, freedom of thought, healthy boundaries.
- Eight extensible schools: Human Dignity & Protection; Entrepreneurship & Economic Empowerment; Media, Arts & Storytelling; Youth & Future Skills; Creative Economy & Craftsmanship; Technology & Responsible Innovation; Peace & Social Impact; Lifelong Learning & Personal Growth.
- Courses, microlearning, workshops, mentorship, studios, open resources, and assessed certificates are distinct formats.
- Certificates indicate actual verified outcomes, not accreditation or professional licensure without valid external authority.
- Core safeguarding education should be accessible; never promise employment or income.
- Children and young people require age-appropriate content, consent where applicable, safe communications, moderation, privacy and reporting pathways.

## Bounded architecture
1. Public Academy: cinematic landing page, schools, catalog, course details.
2. Learner Campus: enrollment, progress, lesson player, resources, assessments, learning passport.
3. Faculty Studio: course authoring, video/resource uploads, subtitles, drafts, review and publish.
4. Academy Operations: instructor roles, curriculum approval, safeguarding workflow, metrics and audit.
5. Verification: server-issued certificate records and public minimal-data verification.
6. Academy backend: separate Academy namespace and server-enforced authorization; no dependency on Admin V3 implementation details.
7. Video: dedicated object storage/streaming, signed access when needed, caption support, copyright and accessibility checks. Never use GitHub repo as a video library.

## Minimum domain model
school(id,slug,status)
program(id,school_id,format,audience,age_band,status)
course(id,program_id,version,language,status)
module(id,course_id,sequence)
lesson(id,module_id,type,sequence,resource_ref)
enrollment(id,learner_id,course_id,status)
progress(id,enrollment_id,lesson_id,state,updated_at)
assessment(id,course_id,version,passing_rule)
attempt(id,assessment_id,enrollment_id,score,result)
credential(id,learner_id,course_id,issued_at,verification_token,revoked_at)
media_asset(id,owner_id,storage_ref,caption_ref,review_status)
audit_event(id,actor_id,action,entity_id,created_at)

All authorization must be enforced server-side with deny-by-default policies; UI role checks alone are insufficient. Personal data must not be placed in public GitHub files.

## Initial pilots
1. The Art of Being Human — youth character and social-emotional learning; participation portfolio, not moral ranking.
2. Conscious Parenting & Child Safeguarding — specialist-reviewed, age-appropriate, with safe referral guidance; never amateur diagnosis/investigation.
3. Creativity to Economic Opportunity — practical creator learning with Marketplace preparation; no earnings guarantee.
4. Young Creators & Future Media — guided creative production, with youth safeguarding and publication consent.

## Release gates
A. Read-only audit and inventory of existing Academy, auth, translation and deployment wiring.
B. Add Academy-owned catalog and public course detail experience without touching protected paths.
C. Test navigation, mobile, accessibility, translations and fallback; verify no regression.
D. Define isolated backend/RLS/storage with explicit approval before creating resources or handling real learner data.
E. Implement secure enrollments, player, progress, faculty workflows and assessments.
F. Independent security/privacy review, especially for minors; only then issue real credentials.
G. Controlled production launch with rollback plan.

## Current verified baseline
`academy.html` uses modular `sections/academy/**`, `assets/css/academy.css`, `assets/js/layout.js`, and `assets/js/navigation.js`. Existing course-themed cards mainly link to other portal pages. The Learning Passport and certificates are described conceptually; operational LMS functionality was not verified in these Academy files.

This document is a boundary and implementation contract, not evidence of completed functionality.
