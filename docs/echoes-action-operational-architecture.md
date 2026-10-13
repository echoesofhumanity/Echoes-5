# Echoes Action — Operational Architecture (Draft 01)
Date: 2026-10-13
Status: DESIGN ONLY — not an active emergency or missing-person service.

## Identity
Echoes of Humanity is a borderless digital civic ecosystem, not solely a humanitarian aid organization. Action is one mission within that ecosystem. Keep the established calm cinematic voice and protect human dignity. Digital citizenship is participatory membership, never a claim of legal nationality or state authority. Assistance must not depend on membership.

## Public experiences
1. Echoes Alert — accessible reporting of urgent protection concerns and humanitarian needs; triage, verified referral, case tracking, and safe follow-up. Direct imminent danger to the relevant official emergency service first.
2. Echoes Missing — protected missing-person reporting and reunification coordination, with priority pathways for people living with dementia, people with cognitive disabilities, and children.
3. Collective Responsibility — explain safe civic participation; this is a narrative layer, not a third intake app.

## Echoes Missing minimum viable product
- Safe Profile: voluntary advance preparation by the person or a legally authorized representative, with purpose-limited contact and communication guidance; no public health records.
- Missing Alert: verified report, case ID, human risk triage, official-service referral, restricted coordination workspace.
- Report a Sighting: accessible witness form, approximate place/time and optional evidence; privately delivered to authorized reviewers, never automatically published.
- Safe Reunion: identity and authority checks before disclosing information; closure and retention workflow.

## Safety gates — required before launch
- Confirm lawful basis, safeguarding protocols, and country-by-country legal review for sensitive data and child protection.
- No covert tracking, open location histories, public face recognition, automatic photo publication, or crowd-directed searches.
- Respect adult autonomy; family relationship alone does not authorize revealing a person's whereabouts.
- Optional location sharing or wearable integrations only after explicit, valid authorization, suitable safeguards and revocation controls.
- Restrict data access by role, log every case access/change, encrypt data in transit and at rest, set retention/deletion policy, and review incident response.
- Require trained human approval for alerts, referrals, volunteer tasks and closure; AI may assist with translation, summarization and duplicate detection but cannot decide safety-critical outcomes.
- No claim of operational partnership with authorities until agreements and verified contacts exist.

## Operational states
Draft -> Submitted -> Human Review -> Verified / Rejected -> Official Referral (when appropriate) -> Coordinated Follow-up -> Resolved / Closed.
Urgent risk must immediately direct users to official emergency channels; the platform must not imply dispatch capability before it exists.

## System boundaries
Public multilingual interface (Echoes-5) -> authenticated secure intake API -> protected case database -> role-based response console -> verified institutional coordination.
Do not store case details in GitHub Pages, browser localStorage, public repositories or unaudited analytics. Keep Admin V3 and unrelated Radio/TV/Marketplace modules untouched.

## First delivery sequence
1. Approve safety architecture and country pilot.
2. Build secure roles, access rules, audit logs and case lifecycle.
3. Implement Echoes Missing protected intake and human review; test with synthetic cases only.
4. Implement Echoes Alert intake/referral and trained response procedures.
5. Add public Action entry points only when safe destination flows exist.
6. Pilot with qualified partners, then expand region by region.

## Visual language
Retain existing Echoes-5 dark navy, restrained turquoise, typography, motion, cards, mobile layout and multilingual/RTL architecture. No charity-style imagery, crisis sensationalism, or misleading live-service buttons.

## Echoes Alert — Personal Safety mobile application (Draft 02)
Purpose: a discreet, accessible, mobile-first route to seek help during sexual violence, domestic abuse, stalking, threats, coercion, unlawful confinement or other immediate danger. Also supports a separate humanitarian-needs pathway. Never require Echoes citizenship or account creation to view emergency guidance.

### Critical user journeys
- Emergency SOS: a clear, deliberate action; immediately surface the country-appropriate official emergency calling option. Optional trusted-contact notifications and location sharing require advance setup, informed permission, and a functioning delivery channel. Explicitly show whether each message is queued, sent, delivered, acknowledged, or failed; never equate sending with rescue.
- Discreet request for help: survivor-controlled, low-visibility communication designed and tested with domestic-violence specialists. Do not promise invisibility; phone notifications, call logs, device monitoring, browser history, accessibility settings and network records can expose activity. Provide an explicit safety-exit approach and accessible alternatives, validated with experts before deployment.
- Post-incident support: non-judgmental choices for medical care, official reporting, evidence preservation information and qualified support referrals. Do not pressure survivors to disclose details or report to police except where law or immediate safeguarding obligations require action.
- Humanitarian need: a distinct reporting flow with separate consent, data minimization and referral rules, not a shared public incident feed.

### Launch prerequisites
- Map verified emergency numbers, support services, legal obligations and referral agreements per pilot jurisdiction; no claim of direct dispatch or 24/7 staffing without staffed operations and service-level tests.
- Complete survivor-centered threat modeling, safeguarding and accessibility reviews; test with specialists and synthetic cases, not real survivor data.
- Define explicit opt-in and revocation for contacts, location, photos, audio and notifications. Do not enable covert recording, background tracking or automatic evidence capture by default.
- Design for weak connectivity, device loss, abusive-device monitoring, accidental activation and malicious reports; show clear failure states and official alternatives.
- Protect case and identity data with least privilege, short purpose-bound retention, audit logging, encryption, incident response, and deletion/export processes subject to applicable law.

## Echoes Response Intelligence — shared AI assistance (Draft 02)
AI is an advisory layer behind Alert and Missing, not an autonomous dispatcher or investigator.

### Allowed assistive functions
- Multilingual intake support, accessible language and human-reviewed translation.
- Structured case summaries with provenance, confidence/uncertainty indicators and explicit unknowns.
- Possible duplicate-report detection, jurisdiction-specific referral suggestions based on verified directories, and missing-information prompts.
- Queue organization for human review; rule-based urgent-risk flags must never delay direct access to emergency services.

### Forbidden autonomous actions
- No automated credibility scoring of survivors, abuse allegations, witnesses or missing persons; no inference of guilt, consent or capacity from language, behavior or images.
- No independent decisions to publish a missing person's identity, reveal a location, notify a suspected abuser, deploy volunteers, contact law enforcement, close cases or deny assistance.
- No general-purpose AI training on sensitive case records, biometric identification, open-web people tracking or undisclosed transfer of sensitive data to model providers.

### Coordination architecture
Mobile clients -> minimal secure intake service -> protected case store and immutable audit trail -> deterministic emergency-routing safeguards -> AI assistance in a restricted processing boundary -> trained human coordinator -> verified institution or authorized field team.
AI recommendations require provenance, role-scoped access, recorded human decisions, escalation on uncertainty, model evaluation, red-team testing and a kill switch. When AI fails, human workflows and emergency-service directions remain available. No automated message to a third party without explicit, tested authorization and approved operational rules.

### Release order adjustment
Before public Action buttons or mobile SOS are activated, first validate pilot-country legal/safeguarding rules, verified referrals, staffed response coverage, delivery acknowledgements and end-to-end synthetic incident drills. Mobile app installation alone does not provide emergency response capability.
