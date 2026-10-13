# Echoes Response Center — Protected Case Data Architecture
Version: Draft 01 | 2026-10-13 | Design specification only; NO database deployment.

## Verified starting point
Connected Echoes of Humanity Supabase project was inspected at table-metadata level. Existing public tables support admin/content/marketplace; no dedicated Alert/Missing case tables were listed. Do not repurpose admin, marketplace or public content tables for sensitive reports.

## Security boundary
Propose a separate private schema `response_private`, not exposed by PostgREST. Only vetted server-side services with scoped permissions can access it. Public GitHub Pages and browser clients must never receive a service-role key, direct table access, private storage URLs or unredacted cases. No live intake until a qualified staffed response service exists.

## Logical entities (not yet created)
- response_cases: opaque case_id, pathway (alert_personal_safety, alert_humanitarian, missing), jurisdiction, status, created_at, retention_class, risk_flag (human-review only). Avoid sensitive narrative in indexed case metadata.
- response_reporters: encrypted, minimally necessary contact details and verified authority/relationship where appropriate; separate from cases and not publicly queryable.
- response_subjects: strictly controlled identity and protection needs; only for a verified purpose, not a public directory.
- response_sightings: private observation time/approximate area, provenance, attachments references and verification state; no public map of tips.
- response_consents: purpose, legal basis/authority, scope, withdrawal and expiry; distinguish subject consent from guardian authority.
- response_assignments: vetted coordinator/partner identity, role, jurisdiction, explicit scope and expiry; do not infer privileges from general site-admin roles.
- response_referrals: verified institution, channel, timestamps, acknowledgment and delivery state; never claim official receipt from a sent message alone.
- response_events: append-only audit events for access, decisions, sharing, corrections and closure; redact secrets from event payloads.
- response_safe_profiles: optional advance preparation with distinct consent/authority checks, strictly restricted fields and deletion/expiry.
- response_attachments: encrypted private storage references, content-type and malware scanning state; never public object buckets.

## Roles and access
Intake gateway can submit minimal encrypted data but cannot read other cases. Human triage staff can read assigned cases only. Specialized safeguarding reviewers handle sensitive violence/child cases. Partner access is explicit, temporary and field-limited. System auditor reads redacted audit events. No general admin, volunteer, AI worker or marketplace role inherits case access.

## Case lifecycle
Submitted -> Human Triage -> Verified / Declined (with safe handling) -> Referred / Coordinated -> Follow-up -> Closed -> Retention expiry.
Urgent-risk guidance to official services must be available even if intake, AI, database or notification services fail. Closure never automatically discloses an adult's whereabouts.

## AI data boundary
AI receives only purpose-limited, redacted case extracts when necessary. Default no training or retention by external model providers; vendor review and enforceable processing terms required. Output is advice with citations/provenance and uncertainty, never a decision to dispatch, publish, disclose location, or reject a survivor.

## Technical acceptance gates before implementation
1. Select pilot country and complete legal review for sexual violence, child protection, health/disability data and cross-border transfers.
2. Approve survivor-centered threat model, DPIA/impact assessment, retention and breach response.
3. Verify staffing, service coverage, institutional contacts and referral acknowledgments.
4. Design and independently review least-privilege database roles, RLS/GRANT policy, encryption/key management, audit immutability and private object storage.
5. Test exclusively with synthetic data, including abusive-device scenarios, false reports, outages and revoked consent.
6. Deploy migrations to a separate staging environment first. Production deployment requires explicit approval after tests.

## Non-goals of this change
No SQL migration executed, no new table, no API, no real SOS or missing-person intake, no production data changes, no changes to Admin V3 or Marketplace.
