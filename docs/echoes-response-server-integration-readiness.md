# Echoes Response — Server Integration Readiness Gate
**Draft 01 | 2026-10-13 | Review-only, no deployment**

## Decision
**NOT READY for a server endpoint, real case intake, or coordinator access.** Existing synthetic decision tests evaluate supplied flags; they do not verify tokens, MFA, staff approvals, case assignment authenticity, or actual RLS behavior. A passing synthetic test is not an operational security certification.

## Required gates (all currently open)
| Gate | Required evidence | Current state |
| --- | --- | --- |
| Auth trust | Verify staging issuer, signature, audience, expiry, subject, and MFA assurance server-side; reject wrong-project tokens | Not implemented |
| Staff enrollment | Private default-deny roster with identity verification, independent approvers, role/jurisdiction vetting and revocation | SQL review draft only; not deployed |
| Approval integrity | Two-person approval for safeguarding; atomic transition, concurrency/replay defense, immutable audit | Protocol only |
| Case authorization | Request-time roster + active assignment + exact case/scope/jurisdiction + permitted action | Synthetic-only kernel |
| Database isolation | Reviewed least-privilege service identity, restricted schema grants, forced RLS and negative access tests | Default-deny staging tables exist; integration not reviewed |
| Sensitive data | Retention, consent/legal basis, encryption/key ownership, breach plan, secure attachments | Not implemented |
| Operational safety | Trained responders, verified institutional contacts, staffing, escalation and failure procedures | Not verified |
| Independent review | Threat model, privacy/legal/safeguarding review and penetration tests with synthetic data | Not completed |

## Correct order
1. Review the coordinator roster SQL and transition/audit model; resolve how approver authority and MFA are verified, not merely stored as caller-provided flags.
2. Build a **local-only synthetic** identity-verification adapter contract; fail closed if verification evidence is missing. Do not use production secrets or real people.
3. Implement and test the private staging roster/approval mechanism after explicit security review and deployment approval.
4. Implement a restricted server-only authorization gateway in staging, with request-time authorization and negative integration tests. No public routes or privileged browser keys.
5. Perform independent security, privacy, legal and safeguarding review before considering a limited pilot.

## Existing controls
Staging project: `echoes-response-staging` (separate from production). Private tables: `cases`, `case_events`, `case_assignments`, all with forced RLS and no normal-user grants. Assignment validity helper is invoker-security and is not a privileged authorization gateway. The roster table has not been deployed.

## Go / no-go rule
Until every applicable gate has evidence and human sign-off, **NO-GO**. Echoes Alert and Echoes Missing remain informational, not operational emergency or missing-person services. No sensitive personal reports are accepted.
