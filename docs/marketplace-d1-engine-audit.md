# D1 — Existing Marketplace engine reuse audit

Status: source inspected; adapter committed; browser regression **not yet run**. No production deployment or sales enabled.

## Source of truth (main, 28 Nov 2026)
| Source | Existing contract | Important limitation |
|---|---|---|
| assets/js/marketplace-catalog.js | Validates synthetic catalog, unique UUID/slug, concept-only, unpublished and checkout-disabled | Rejects real published products by design |
| assets/js/marketplace-selection.js | Session storage, one-hour expiry, 50 lines, quantities 1–99, add/set/remove/clear | Browser demo selection only; no customer identity |
| assets/js/marketplace-cart.js | Validates synthetic lines, EC totals, 50 lines, 1–99 each, overflow and duplicate protection | Calculation only; no payments |
| assets/js/marketplace-synthetic-order.js | Creates in-memory synthetic orders, status history, confirm/fulfill/cancel/reverse transitions | One in-memory order; no persistence or actual delivery |
| assets/js/merchandise-catalog.js | Validates isolated concept catalogue | Not a public real creator catalogue |
| merchandise.html | Existing detail dialog, localized synthetic cart and order UI, original 9-language copy | Original customer UI should be reused/refined, not replaced by simple V2 cart |
| producer-unified-flow-v1-synthetic-test.html | Existing synthetic producer/reviewer/publisher workflow | Not proof of real server-side permissions or persistence |

## New adapter
assets/js/marketplace-digital-prelaunch-adapter.js delegates to the four existing Marketplace modules. It has no own cart, order ledger, payment code or storage. It provides a single synthetic-only interface for later digital customer UI integration.

Dependencies, in order:
1. marketplace-catalog.js
2. marketplace-selection.js
3. marketplace-cart.js
4. marketplace-synthetic-order.js
5. marketplace-digital-prelaunch-adapter.js

It deliberately rejects an unknown concept, a missing catalog and missing dependencies. It delegates all quantity and order state rules to the existing engines. Empty selection is represented as a zero-total read-only summary; order creation on an empty cart is rejected.

## Critical architectural distinction
The original cart validator intentionally rejects real/published products. It **must not** be relaxed or repurposed to charge real digital products. For prelaunch D2–D8, digital products require a separate, server-authorized product projection and synthetic test fixtures. Live checkout is D9 only. The adapter is a bridge for preserving proven synthetic behavior, not a payment or production digital product engine.

## Regression acceptance still required
- Catalogue loads and rejects unsafe entries.
- Quantity 1, 99 accepted; 0 removes; 100 rejected.
- Two different products calculate exact EC totals.
- Clear basket removes selection; TTL expires after one hour.
- Create → confirm → fulfill → reverse and create → cancel work; forbidden transitions fail.
- Refresh and cross-page navigation preserve demo selection only within same origin/session.
- Mobile Chrome and Safari, keyboard navigation, nine languages and RTL.
- Existing Merchandise remains unchanged.

## Next implementation boundary
D2: define digital rights, file/preview metadata and publication states in an isolated staging schema with role policies; do not connect live payments or production Supabase. D1 remains **pending browser acceptance** until regression evidence is collected.
