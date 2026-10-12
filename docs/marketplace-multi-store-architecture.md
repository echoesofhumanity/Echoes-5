# Echoes Marketplace — Multi-store architecture (Phase 1 decision)

Status: architecture specification only. No database changes, access grants, checkout, payment, or UI changes.
Baseline: Echoes-5 main at 63b8237f83a72c8e6537ac9de4ce3992f349a6a4.

## Purpose
Marketplace is an international, creator-centered multi-vendor commerce platform, not a four-item merchandise catalog. Every approved creator or collective can operate a storefront with many listings. Echoes Merchandise is a platform-operated store, not the marketplace's root product model.

## Domain boundaries
- **Creator identity**: private verification, publication consent and revocation; separate from store branding and public biography.
- **Storefront**: one independently addressable store, slug, owner/organization, public description, languages, moderation state, policies and public contact route. Model for multiple stores per creator in the future; do not assume a one-to-one database constraint.
- **Listing**: belongs to a store and has creator attribution, category, product type, licensing, publication state, images and provenance. One store may have many listings.
- **Variant/offer**: SKU, formats, price, currency, availability and delivery method as appropriate to physical or digital goods.
- **Orders**: buyer checkout may include multiple stores; settlement, fulfillment, cancellations and returns are tracked by seller/order line. Not implemented yet.

## Store and catalog categories
Independent music, books and audiobooks, visual art, handmade crafts, physical goods, licensed digital downloads, and Echoes Merchandise. A product type must control previews, rights, fulfillment and return rules; do not force a single physical-goods template on every category.

## Human dignity and commerce
- No creator story, name, photo or sensitive evidence becomes public without explicit current consent.
- Verification is private; public status is distinct from verification evidence.
- Transparent fees and creator proceeds; no volunteer donation requirement.
- Copyright and licensing must be validated before publication or local reproduction.
- Translations are editorially controlled; never infer claims of provenance or maker identity.

## Publication and security
- Current `echoes_creators`, `echoes_products`, `echoes_product_variants` and `echoes_public_merchandise_catalog` remain unchanged.
- The existing merchandise-only projection is **not** the eventual global marketplace public catalog.
- Public catalog reads must use least-privilege projections with publication, consent and ownership checks; private identity/financial records stay private.
- Future creator management must be role-scoped, audited and isolated from Admin V3.

## Build order (one reviewed change per commit)
1. Inventory current Marketplace and Merchandise routes, assets and existing Supabase schema/constraints.
2. Design storefront ownership and moderation schema with explicit permissions, slugs and deletion/revocation behavior.
3. Review and apply the storefront schema with RLS closed by default; verify existing functions unaffected.
4. Connect products to stores without changing the four concept merchandise listings.
5. Build one read-only store profile and multi-item storefront, with localization and safe empty states.
6. Extend to category-specific product pages and digital/physical delivery types.
7. Only later: creator onboarding, commerce, tax, shipping, settlement, refunds and legal review.

## Out of scope now
No changes to Admin V3, backup repositories, unrelated Supabase tables, payment processing or real product publication. Logistics partnerships and consolidation remain future design work.
