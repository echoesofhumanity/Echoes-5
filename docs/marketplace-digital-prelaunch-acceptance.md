# Echoes Marketplace — Digital-first prelaunch acceptance

Status: DEVELOPMENT CONTRACT ONLY — NOT LIVE-SALE AUTHORIZATION.

## Agreed scope
International digital books, audio/music and digital visual art first. Physical goods and selected-country shipping are a separate later phase. Live sales are the final stage, not part of this development phase.

## Reuse existing proven functionality
- Producer A / reviewer B / product reviewer C / publisher D acceptance separation.
- Original Merchandise product detail, quantity (1–99), synthetic cart, calculations, synthetic order lifecycle and localized text. No new simplified cart engine.
- Existing concept products remain checkout-disabled and clearly marked as synthetic.
- The portal and standalone browser views must share catalog, cart and order contracts.
- Preserve Admin V3, backups, Oracle, radio and existing production Supabase.

## Digital product acceptance requirements
Each listing requires creator and store identity, publication consent, category (ebook, audio, art), localized title/description with English fallback, approved preview, file format and size, rights evidence, customer license, EC reference price, territory eligibility and review audit. Rights evidence and private identity records must never be public.

State flow: draft → submitted → reviewed → approved → published → paused/withdrawn. Reviewers must be distinct from submitting creators. Publishing must be authorized and auditable.

## Customer journey (synthetic until final gate)
1. Search, browse and filter approved digital listings and creator storefronts.
2. View product preview, format, license, consented creator story and EC reference price.
3. Add to existing shared cart; preserve 1–99 quantity controls when licensing permits, enforce per-license limits when it does not.
4. Review item totals and transparent fees; create synthetic order with no payment.
5. Simulate order authorization and delivery entitlement.
6. Display buyer library, order history, receipt preview and support/refund request.
7. Real downloads, once permitted, require authenticated server-side entitlements, expiring links and access audits; GitHub Pages cannot authorize downloads.

## Build units and acceptance
| Unit | Deliverable | Evidence |
|---|---|---|
| D1 | Audit and adapter for existing producer, Merchandise and EC engines | No duplicated cart engine; existing regression tests preserved |
| D2 | Digital listing, rights and role schema in isolated staging | Creator cannot self-approve; server permissions verified |
| D3 | Approved public read projection, search, store pages | No drafts, withdrawn or unconsented items exposed |
| D4 | Digital product detail and license/preview | Correct formats, safe text, accessibility |
| D5 | Shared cart and synthetic order | Quantities, totals, cancellation and duplicate requests tested |
| D6 | Simulated delivery and buyer library | Unauthorized access denied; entitlement expiry/revocation tested |
| D7 | Nine languages, RTL, mobile and browser validation | EN/TR/RU/DE/ES/FR/PT/ZH-CN/AR; Chrome and Safari; portal and standalone |
| D8 | Operations dry run | Audit, support, incident, rollback and test evidence |
| D9 | FINAL ONLY: live sales | Applicable G1–G10 readiness gates passed and explicit release approval |

## Hard safety boundary
- Keep remote checkout disabled and checkout_enabled false through D1–D8.
- No live payment, stored EC value, transfer, settlement or customer charge.
- Do not publish unverified products or protected downloadable files to public GitHub Pages.
- One reviewed change → test → commit. Development branch first, isolated approved previews only.
- Never claim production readiness from synthetic tests.

## Unresolved before final live sales
Seller of record, tax/VAT and jurisdictions, supported countries, payment provider, EC legal classification, digital license and refund terms, creator payout and dispute ownership.
