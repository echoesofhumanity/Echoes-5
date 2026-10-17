# Marketplace V2 — Synthetic cart storage and eligibility audit
Date: 17 October 2026
Scope: Echoes-5 main, inspected shared JavaScript and demo pages. Read-only.

## Selection persistence
`assets/js/marketplace-demo-selection.js` stores only `concept_id` and `quantity` in browser sessionStorage, key `echoes_marketplace_synthetic_cart_v1`. Envelope version is 1, with `saved_at`; reads reject future timestamps or selections older than 60 minutes and clear invalid state. Limits: at most 50 distinct concept IDs, integer quantity 1–99, unique slug-format IDs. The add path also prevents quantities above 99. This is tab/session-scoped demo state, not durable purchase authority.

## Cart calculation
`assets/js/marketplace-demo-cart.js` accepts 1–50 unique UUID product lines, quantities 1–99, positive safe-integer EC prices, and checks subtotal/total safe-integer arithmetic. Catalogue products must be `status=concept`, `published=false`, `checkout_enabled=false`. Output is frozen, marked `synthetic_demo` and checkout-disabled. It performs no checkout, reservation, payment or persistence.

## Demo order
`assets/js/marketplace-demo-order.js` validates cart integrity and permits only created -> confirmed/cancelled, confirmed -> fulfilled/cancelled. Its `DEMO-` order IDs, `payment_status=not_applicable` and checkout-disabled flag are not database order authority.

## Handoff
`marketplace-demo.html` reads and writes selection through the shared selection helper. `merchandise.html` presents concept-only selections and checks the checkout-disabled flag. No demo selection may be mapped directly to a staging product or trusted for pricing, seller eligibility or inventory.

## V2 design gates
1. Keep the synthetic selection key and demo mode unchanged.
2. Use a separate authenticated staging catalogue for any future purchasable test products; resolve identity and price server-side.
3. Validate and normalize product lines server-side, with stable lock order, 50-line bound, quantity bounds and overflow checks.
4. Treat sessionStorage as untrusted user input; never infer payment authorization from demo selection.
5. Test expired, corrupted, duplicated, oversized, cross-tab and manipulated selection states before connecting V2.
6. Retain all current demo and single-item staging checkout paths unchanged.

**NO-GO:** No V2 checkout or real payments activated.
