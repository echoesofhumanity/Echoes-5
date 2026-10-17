# ECHOES OF HUMANITY — MARKETPLACE / MERCHANDISE / EC
## Consolidated Technical Audit and Completion Backlog
Date: 17 October 2026
Repository: echoesofhumanity/Echoes-5, main
Staging database: echoes-response-staging (ymxpbkviadypsvahrqwt)
Classification: READ-ONLY EVIDENCE + REMEDIATION PLAN — NOT RELEASE APPROVAL

### Scope and evidence limitations
Reviewed the GitHub repository's relevant Marketplace, Merchandise, storefront, synthetic cart/order/catalogue, EC wallet/checkout pages, test workflow, SQL drafts, architecture and security audit documents; queried live staging PostgreSQL catalog metadata, function definitions, trigger definitions, constraints, grants, migrations, Edge Function list and Supabase security advisors. No production database, backup repository, Admin V3, Radio, TV or unrelated response_private data was changed. This is a source/configuration audit, not a completed penetration test, live-browser multilingual test, independent legal review or exhaustive inventory of external services.

### Confirmed architecture and safeguards
1. Demo concepts are not real products: the synthetic catalogue requires concept/unpublished/checkout-disabled; browser sessionStorage is untrusted, expires after 60 minutes and stores concept ID/quantity only. Merchandise concept adapter is read-only and not wired to live page. Synthetic test scripts and a GitHub Actions workflow exist; workflow executes only on selected demo-file changes or manual dispatch. This audit did NOT run or confirm a green CI run.
2. Legacy staging checkout is a separate single-item RPC: `public.ec_staging_checkout` checks auth.uid, quantity 1–100, wallet, idempotency, published product, verified seller, stock, EC balance and bigint overflow; wallet and product rows are locked. `ec_staging_cancel_order` locks wallet and buyer-owned order, verifies prior debit, posts reversal and restores stock. Repeated cancellation returns the existing result without new credit.
3. Ledger CHECK accepts topup_settled, checkout_debit, checkout_reversal, refund_credit and administrative_correction; unique (wallet,idempotency) and (wallet,operation,reference) constraints exist. Enabled `ledger_immutable` BEFORE UPDATE/DELETE trigger calls `ec_wallet.reject_ledger_mutation()`, which raises an exception. The trigger is enabled (tgenabled=O).
4. Verified staging products require a verified seller when active/published, enforced by an enabled trigger. Product price >0, stock >=0, publication status draft/review/published/withdrawn. Seller and product FK constraints exist.
5. Payable state machine is protected by enabled triggers: terminal approved/void immutable; unvalued -> pending_review/void, pending_review -> approved/void. Payable seller/order mismatch rejected. A separate order trigger blocks cancellation if payable is pending_review or approved. An exception in the cancellation transaction should roll back preceding reversal/stock changes; still require a synthetic test.
6. All ten ec_wallet base tables have RLS enabled, no policies, and no direct anon/authenticated table grants in inspected evidence. Public EC RPCs grant authenticated EXECUTE, not anon; five are SECURITY DEFINER. Internal `staging_register_unvalued_payable` and `staging_payables_summary` have explicit postgres/service_role EXECUTE ACLs, not authenticated. No staging Edge Functions were listed.
7. `ec_wallet` has existing reconciliation, cost simulation, distribution review and finance evidence features; existing reporting is legacy-order-specific. Supabase migration history shows EC staging migrations through 20261016053350.

### Priority findings and remediation gates

**P0 / BLOCKER — before any V2 write path**
- P0-01: V2 multi-line order, reservations, event immutability and atomic checkout/cancel RPCs are not deployed. Base SQL and integrity-guard SQL are REVIEW DRAFT ONLY; V2 tests T01–T25 remain pending. Action: independently review additive V2 schema, server-owned RPC, invariants and synthetic test fixtures; never reuse legacy RPC.
- P0-02: EC is signed wallet-delta accounting, not proven balanced double-entry liabilities and seller settlement. Current ledger CHECK excludes proposed V2 operation names. Action: approve operation taxonomy, double-entry/reconciliation model, accounting sign-off and separately reviewed migration before V2 posting.
- P0-03: Other privileged ledger writers (service_role external jobs, direct SQL, scheduled integrations) are not fully inventoried. No deployed staging Edge Functions is narrower evidence. Action: audit credential holders, jobs and writer paths; require wallet-first locking across every posting route and test concurrency.
- P0-04: No executed adversarial test evidence for cross-user isolation, replay, balance races, stock races, cancellation races, rollback and legacy regression. Action: run only with designated synthetic identities after reviewed staging-only implementation and explicit approval.
- P0-05: Real payments, EC legal classification, seller-of-record, consumer rights, tax, refunds, fiat redemption, provider/webhooks and production operations are unapproved. Action: keep real commerce NO-GO.

**P1 / SECURITY & INTEGRITY**
- P1-01: Five authenticated-callable SECURITY DEFINER public RPCs. Their source checks auth and ownership in key paths, but the Supabase security advisor flags their callable privileged boundary. Action: threat-model and negative-test each; preserve required legacy access rather than indiscriminately revoking EXECUTE. Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- P1-02: `ec_wallet.reject_ledger_mutation` has mutable search_path per advisor, although its inspected body only raises an exception. Action: prepare a narrowly scoped hardening migration after checking dependencies and preserving trigger behavior. Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- P1-03: Staging Auth leaked-password protection is disabled according to advisor. Action: enable through reviewed Auth configuration after evaluating test-account implications. Advisor: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- P1-04: RLS enabled with no policies on ten ec_wallet tables is consistent with default-deny direct access; advisor informational warning is NOT automatically a vulnerability. Do not add broad policies or grants merely to silence it. Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- P1-05: Existing staging product has nullable seller_id; no explicit test_only/environment/review/revision fields. Future V2 must fail closed for missing metadata, seller identity and policy/rights approval, using separate staging identity/projection.
- P1-06: SQL draft quantity BETWEEN 1 AND 100 conflicts with V2 contract 1–99; legacy checkout 1–100 must remain unchanged. Align draft V2 lines/reservations to 1–99 before migration.
- P1-07: Existing cancellation refuses valued payables; define explicit reconciliation and support handling for pending_review/approved, not silent automatic refund. Confirm rollback behavior in tests.
- P1-08: Bigint EC amounts may exceed JavaScript Number.MAX_SAFE_INTEGER. Define server limits and safe transport representation before frontend V2.

**P2 / EXPERIENCE & OPERATIONS**
- P2-01: `ec-checkout-test.html` generates a fresh idempotency UUID for each new click; lost-response retry persistence is not guaranteed. Design a scoped durable retry key for V2, without modifying existing test flow during audit.
- P2-02: Repeated cancellation returns refund_ec despite no new credit; distinguish historical reversal from a new refund in localized UI.
- P2-03: Wallet transaction history shows raw operation codes; map approved labels in all supported active languages and Arabic RTL. Do not assume current language count from older reports; coordinate with parallel translation work.
- P2-04: V2 reconciliation, multi-seller obligations, event history, fulfilment, returns, disputes, tax and customer support are not operational.
- P2-05: GitHub Actions synthetic test workflow does not automatically run on changes only to docs/SQL/EC wallet checkout pages. Add scoped V2 CI after executable tests exist; do not claim coverage today.
- P2-06: Live browser tests of responsive layouts, accessibility, legal copy and localization have not been performed in this audit; require evidence before release.

### Ordered implementation program — one change/test/commit at a time
A. Approve this report and freeze legacy/demo boundaries.
B. Correct V2-only SQL draft quantity limits and review existing integrity-guard draft without executing it.
C. Define staging-only catalogue metadata/eligibility projection with least privilege, seller/policy/rights checks and fail-closed defaults.
D. Inventory all privileged ledger writers and document shared wallet-first lock order, V2 operation taxonomy and financial reconciliation.
E. Review/harden security-definer RPC access, trigger search_path and Auth protection in individually approved staging-only changes.
F. Design/implement additive V2 schema and atomic multi-item checkout/cancel with immutable lines/events, server-side totals, inventory reservation expiry, seller allocation and rollback.
G. Create synthetic fixtures, run T01–T25 plus catalogue C01–C18, verify old checkout regression and capture signed evidence.
H. Add V2 CI, localize operation labels and test mobile/RTL/accessibility; establish support, alerts and incident/rollback runbooks.
I. Obtain jurisdiction-specific legal, payment-provider, privacy and finance approvals before any limited production pilot.

### Non-goals and explicit status
No production EC issuance, payment provider, live checkout, payouts, deployment, migration or production-ready claim. No direct DB writes were performed in this audit. External jobs/credentials, penetration tests, actual test outcomes and legal approvals remain unverified. The unrelated response_private schema was not audited or changed.

### Source index
- docs/marketplace-v2-independent-staging-catalog-contract.md
- docs/marketplace-v2-staging-catalog-schema-gap-review.md
- docs/marketplace-v2-staging-rls-rpc-boundary-audit.md
- docs/marketplace-v2-staging-checkout-cancellation-source-audit.md
- docs/marketplace-v2-acceptance-test-matrix.md
- docs/marketplace-v2-wallet-locking-audit.md
- docs/marketplace-v2-reporting-compatibility-audit.md
- docs/marketplace-v2-frontend-integration-boundary-audit.md
- docs/marketplace-merchandise-production-readiness-gates.md
- docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql
- docs/sql/marketplace-staging-v2-integrity-guards.DRAFT.sql
- .github/workflows/marketplace-synthetic-tests.yml
- Supabase staging catalog queries: pg_proc/pg_get_functiondef, pg_constraint, pg_trigger, pg_policies, pg_class, proacl, role_table_grants; staging list_edge_functions, list_migrations, security advisors.

**Overall release decision: NO-GO for V2 transactions and real commerce. Safe to continue isolated synthetic demo and existing staging single-item tests under current controls.**
