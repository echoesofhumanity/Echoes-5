# Echoes Marketplace — Transparent Cost & Humanitarian Allocation Policy (Draft)
Date: 2026-10-16
Status: DRAFT / STAGING ONLY. Not a legally approved allocation policy, seller agreement or payment authorization.

## Principle
Protect human dignity, compensate independent creators fairly, preserve operational resilience and maximize verifiable humanitarian benefit. No gross-sales-to-charity claims without accounting for actual liabilities and costs.

## Separate accounting buckets
1. **Gross sale / taxes**: record sales amount, applicable taxes and refunds separately; determine merchant of record and tax responsibilities before launch.
2. **Creator entitlement**: contractually defined seller proceeds, accrued only after the relevant fulfillment, settlement and refund conditions are met; never infer fiat payout from an EC debit.
3. **Direct transaction costs**: actual documented payment processing, FX, chargeback, shipping/fulfillment and other attributable transaction costs. No arbitrary markup disguised as a pass-through.
4. **Technical and service operations**: infrastructure, cybersecurity, maintenance, customer support, compliance and necessary staffing, governed by an approved operating budget with periodic variance reporting.
5. **Administration and governance**: executive/board compensation (where permitted), governance, office and general administration. **3% is a long-term efficiency target**, not an unconditional launch ceiling. Specify and disclose the denominator (e.g. net recognized operating revenue) before using any public percentage.
6. **Humanitarian allocation**: the positive residual of eligible, settled and distributable proceeds after contractual creator entitlement, applicable taxes, refunds/reserves, verified direct costs and approved operating/governance spending. Do not treat all gross Marketplace volume as charity proceeds.

## Controls
- All categories have distinct ledger/account codes and evidence links; avoid double counting.
- Define explicit cost allocation for shared services; publish method and exceptions.
- Approved annual budget, monthly reporting, quarterly variance review and independent audit when feasible.
- Disclose creator payout policy, actual operating/admin ratios, charitable transfers, refunds and reserves with clear denominators.
- Restrict related-party payments and board compensation by conflicts-of-interest rules and applicable law.
- Establish minimum operating reserve and chargeback/refund reserve before distributing humanitarian funds.
- Prohibit moving costs from 'administration' to 'operations' merely to report a lower administrative ratio.

## Staging simulation and migration plan
The existing `ec_wallet.staging_allocation_simulation` enforces a **3% operating cap** as an old synthetic scenario only. **It is not the proposed real-world financial policy.** Keep it unchanged for regression comparison; do not connect it to payable approval or live payments.

Next implementation: a separate versioned, read-only scenario calculator with inputs for gross, taxes, creator entitlement, direct costs, approved technical/service operations, administration, and reserves. Output a nonnegative humanitarian residual, transparent ratios and explicit insufficiency/error states. No production write privileges.

## Open approvals before production
- Jurisdiction, entity and merchant-of-record structure; legal treatment of EC.
- Contractual seller share and seller payout currency/timing.
- Tax and processing responsibilities; refund/chargeback rules.
- Revenue denominator and administrative 3% target review horizon.
- Board-approved annual budget, reserve policy and humanitarian distribution criteria.
