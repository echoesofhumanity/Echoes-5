# Marketplace / Merchandise — existing staging schema audit

Date: 17 October 2026. Read-only inspection of Supabase project `echoes-response-staging` (`ymxpbkviadypsvahrqwt`); no production or staging data changed.

## Verified existing entities
All commerce tables inspected are in the private `ec_wallet` schema, **not** `public`:

| Existing table | Verified columns | Implication |
|---|---|---|
| `staging_sellers` | seller_id, display_name, owner_id, verification_status, created_at | Seller identities and preliminary verification already modeled |
| `staging_products` | product_id, title, price_ec, stock, active, seller_id, publication_status | Stock, seller linkage and publishing controls already modeled |
| `staging_orders` | order_id, buyer_id, product_id, quantity, total_ec, idempotency_key, created_at, status, cancelled_at | One-product staging order and duplicate-request key already modeled |
| `staging_seller_payables` | payable_id, order_id, seller_id, state, currency_code, gross_minor, seller_minor, humanitarian_minor, operating_minor, created_at | Seller allocation model exists; amounts and rules need independent verification |
| `wallets` | wallet_id, owner_id, created_at | EC wallet ownership modeled |
| `ledger` | entry_id, wallet_id, delta_ec, operation, reference_id, idempotency_key, recorded_at | Wallet-level entries exist; **not proof of double-entry accounting** |

Other staging tables: `staging_cost_scenarios`, `staging_distribution_evidence`, `staging_distribution_review_log`, `staging_finance_reviewers`. The project also hosts unrelated `response_private` tables; do not modify them.

## Confirmed gaps relative to production design
1. The inspected `staging_orders` row links to one product, not a normalized multi-line order. Do not replace it in place; design a compatible new order-line model in isolation.
2. No dedicated localized product copy, merchant membership/role, inventory reservation, order-event or audit-event table was observed among the inspected `ec_wallet` table names. Verify existing functions and views before proposing migrations.
3. The existing `ledger` contains signed wallet deltas, but a balanced double-entry journal, liability reconciliation and immutable posting guarantees have **not** been demonstrated.
4. Column inspection does not establish row-level security, grants, triggers, constraints, transaction isolation or safe RPC behavior. These require a separate read-only security audit.
5. Seller payables fields do not establish approved commercial terms, settlement eligibility or a legally valid EC-to-fiat conversion policy.

## Next safe work unit
Read-only inspection of `ec_wallet` table constraints, indexes, RLS policies, grants and staging RPC signatures. Then draft additive migrations in repository for review **without executing them**. No real commerce activation, production changes, or alteration of existing synthetic tests.

**Go-live decision: NO-GO** pending documented evidence for the production readiness gates.
