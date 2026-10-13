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
