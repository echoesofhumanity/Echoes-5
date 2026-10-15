# Echoes EC Wallet & Marketplace — 72-hour delivery gates
Date: 2026-10-15. Target review: 2026-10-18.
Status: DEVELOPMENT PLAN, NOT AN AUTHORIZATION TO ACCEPT PAYMENTS.

## Non-negotiable distinction
A static GitHub Pages front end and a browser-only synthetic order state machine cannot securely hold customer balances, issue purchased EC, debit accounts, or settle merchant funds. Never label a browser demo as a live wallet or real checkout.

## Day 1 — foundation
- Freeze passing synthetic catalogue/cart/order regression checks as a safety baseline; keep GitHub Actions enabled.
- Define authenticated customer and seller roles, a server-side immutable EC transaction ledger, integer EC units, idempotency keys, and reconciliation.
- Define EC top-up states: initiated, provider_pending, settled, failed, reversed. Only a verified server-side provider settlement may issue EC.
- Define order states and inventory reservations with atomic EC debit and reversal; no client-controlled prices or balances.
- Identify payment provider, merchant contract, refund rules, compliance ownership, and production credentials before any real top-up.

## Day 2 — integration and languages
- Implement a backend-controlled sandbox wallet, sandbox top-up webhook verification, balances derived from ledger, and duplicate-event protection.
- Connect an authorized product catalogue and seller identity; keep existing concept merchandise unpublished.
- Build EC-only checkout sandbox: stock validation, server-side pricing, debit, order, cancellation/refund and error recovery.
- Audit locale keys and page coverage for each currently configured portal language; add wallet/checkout dictionaries with English fallback. Do not mark a language complete until actual strings and RTL/layout tests pass.

## Day 3 — release gate
- Test authenticated multi-user separation, payment replay/forgery, concurrent debit, negative balance, refund idempotency, duplicate order, price tampering, stock race, and recovery.
- Verify provider settlement/reconciliation, logging, monitoring, support and privacy/security review.
- Publish only a sandbox/preview if any gate remains unmet. Enable production top-up and purchase only with verified licensed provider agreement, legal approval, production secrets held server-side, and completed acceptance tests.

## Initial repository findings
- marketplace.html is a GitHub Pages static page using assets/js/layout.js and assets/js/navigation.js.
- marketplace-demo.html and assets/js/marketplace-demo-{catalog,cart,order}.js explicitly implement browser-only synthetic data and prohibit checkout.
- assets/js/i18n.js lists en,tr,ar,es,fr,de active; pt,ru,zh,hi inactive in the inspected revision. This list is not proof of translation completeness.
- Keep EC displayed as the sole product-price unit. Fiat may be shown only for a legally supported EC top-up.
- Do not change backup repositories, Admin V3, radio/TV, or currently working navigation.

## Decisions needed before production payments
1. Contracted licensed payment provider and country/merchant entity.
2. Legal classification of EC and whether it can be redeemed, transferred, or spent with third-party sellers.
3. Refund/chargeback policy, seller payouts, KYC/AML requirements where applicable.
4. Hosting and backend authentication/ledger platform with secure secret storage.
