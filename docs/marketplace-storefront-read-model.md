# Echoes Marketplace — Storefront read model (Phase 1)

Status: reviewed design contract; not a live public API or published creator storefront.
Baseline: main commit 9ebaa73a857802f28b5039385cf7da116b92e32f.

## Current verified state
- `echoes_marketplace_stores`: official draft store `echoes-merchandise`.
- `echoes_marketplace_store_products`: four linked concept merchandise items, all checkout-disabled.
- Independent creator storefronts: none published or seeded.
- The Marketplace Browse the Catalogue card navigates to the existing Merchandise page. It is a navigation example, not a general creator storefront.

## Read-only storefront contract
1. Route identity: store slug, validated against `^[a-z0-9]+(-[a-z0-9]+)*$`; never trust a URL as authorization.
2. Store fields: slug, display name, public description, store kind; expose only approved public fields.
3. Listing fields: product ID, title, description, type, status and approved public presentation data. Each listing must belong to the requested store.
4. Eligibility: only published, non-suspended stores; only published products; independent store owner must match product creator and creator must be verified, published and have active publication consent. Official merchandise uses its distinct platform-owned rules.
5. Empty state: if no eligible listings, show a localized message without exposing draft/private records or implying a sale is possible.
6. Safety: no price, availability, stock, verified maker, license, download or checkout claim without reviewed supporting data. Never enable checkout from this read model.
7. Localization: English fallback, localized static labels, safe text rendering; never interpret creator text as HTML.

## Security prerequisite before any live public query
The current store-product join table has foreign keys and one-store-per-product uniqueness but **does not enforce owner/product compatibility**. Before adding write workflows, enforce that independent store creator ID equals product creator ID, and official store products are explicitly designated merchandise. Use database-enforced validation and reviewed permissions. Public reads must use a least-privilege security-invoker view or equivalent policy, with RLS and explicit grants verified in Supabase. No anon/authenticated grants exist yet.

## Next implementation boundary
Build a reusable storefront page shell with localized empty state first; then introduce an approved public read projection only after the ownership and consent gates are enforced and tested. Preserve Admin V3 and current Merchandise concept cards.
