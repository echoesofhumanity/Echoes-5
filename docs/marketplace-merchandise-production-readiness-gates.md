# Echoes of Humanity — Marketplace & Merchandise Production Readiness Gates

Status: **architecture specification / NOT production authorization**. Last reviewed: 17 October 2026.

## 1. Immutable safety boundary
- Keep the existing public portal, six-language content, and design operational.
- Keep the Merchandise concept catalogue and Marketplace synthetic cart isolated; `checkout_enabled: false` remains mandatory for concept entries.
- Do not connect synthetic order identifiers, client-side quantities, or demo credits to real purchase authority.
- Never modify the backup repository, Admin V3, production Supabase, Echoes Radio, or Echoes TV under this plan.
- The EC staging environment is not a payment provider and must not be promoted by changing a feature flag alone.

## 2. Proposed domain separation
- **Identity & roles:** buyer, creator, merchant, marketplace operator, support, finance and compliance; enforce least privilege on the server, not in page JavaScript.
- **Merchant onboarding:** verified legal entity/person, payout eligibility, jurisdiction, prohibited goods screening, documented approval, suspension and appeal.
- **Catalogue:** draft → reviewed → published → paused → archived; merchant ownership, localized copy, media rights, stock policy, tax category and product provenance. Demo concepts remain separate.
- **Inventory:** reserve atomically at checkout; release on expiry/cancellation; never infer stock from browser data.
- **Orders:** pending → authorized → confirmed → fulfilled → completed, with explicit cancellation/refund/dispute branches and an append-only event history. Exact states require product-policy approval.
- **Ledger:** immutable double-entry accounting for any EC liabilities and transfers; transaction IDs, idempotency keys, reconciliations and compensating entries instead of balance overwrites.
- **Payments:** regulated third-party payment processing where required; webhook signature verification, replay prevention, refunds and settlement reconciliation. Never collect raw card details on GitHub Pages.
- **Support & audit:** consent-aware evidence retention, access logging, incident handling, dispute workflow and data export/deletion rules.

## 3. Non-negotiable go-live gates
| Gate | Evidence required | Current assessment |
|---|---|---|
| G1 Product/legal policy | Terms, seller agreement, refunds/returns, consumer rights, tax/VAT and jurisdictional review | Not verified |
| G2 EC regulatory classification | Jurisdiction-specific counsel review of stored value, redemption, cross-border sales, KYC/AML and safeguarding | Not verified |
| G3 Identity & permissions | AuthN/AuthZ tests, row-level security, role separation, merchant verification | Not verified |
| G4 Inventory & orders | Concurrent reservation tests, idempotent checkout, state transition tests, refund paths | Not verified |
| G5 Ledger & settlement | Double-entry invariants, reconciliation, negative-balance and replay tests | Not verified |
| G6 Payment integration | Approved provider, sandbox evidence, webhook/security review, no card-data exposure | Not verified |
| G7 Security & privacy | Threat model, secret audit, penetration test, backup/restore, retention and incident plan | Not verified |
| G8 Localization & accessibility | Six-language user acceptance, RTL, translated legal copy, keyboard and screen-reader review | UI language acceptance completed; legal/accessibility unverified |
| G9 Operational readiness | Monitoring, alerting, support runbooks, rollbacks, service ownership and load testing | Not verified |
| G10 Controlled release | Separate staging acceptance, production change approval, rollback rehearsal and limited pilot | Not authorized |

**Decision:** NO-GO for real transactions until all applicable gates are evidenced and explicitly approved. This does not block the informational portal or isolated demos.

## 4. Next implementation unit — staging only
1. Design the normalized relational schema and RLS policy matrix **in a separate staging project**: merchants, merchant_memberships, product_drafts, product_localizations, inventory, orders, order_lines, order_events, ledger_accounts, ledger_entries and audit_events.
2. Create synthetic fixtures and executable tests for ownership boundaries, duplicate requests, insufficient balance, concurrent stock, cancellation and refund.
3. Document evidence against each gate before introducing a user-facing real-commerce control.
4. Preserve one-change → review/test → commit discipline. Do not change production schema, existing live page layout, or demo behavior as part of schema design.

## 5. Open decisions (not assumptions)
- Legal seller of record and supported countries/currencies.
- EC issuance, purchase, expiry, transferability, redemption and refund rules; any displayed exchange references require independent legal/financial review.
- Physical fulfilment versus digital delivery; merchant liability and customer service ownership.
- Payment provider, settlement currencies, tax calculation and invoice issuer.
- Whether creator/merchant onboarding is invite-only at launch.
