# Echoes Marketplace — EC staging access and RPC security audit

Date: 17 October 2026. Scope: **read-only inspection** of `echoes-response-staging` (`ymxpbkviadypsvahrqwt`). No database changes and no live commerce activation.

## Verified safeguards
- All 10 `ec_wallet` base tables have RLS enabled. `FORCE ROW LEVEL SECURITY` is not enabled. No policies are listed for the schema.
- Database privilege checks show neither `anon` nor `authenticated` has direct SELECT/INSERT privileges on those tables; `authenticated` also lacks UPDATE/DELETE. Access is mediated by defined RPCs and privileged internal routines.
- Six inspected `public` EC functions deny EXECUTE to `anon` and permit `authenticated`. Five use `SECURITY DEFINER`; `ec_wallet_snapshot` is invoker mode.
- Inspected functions use an empty `search_path` and schema-qualified object references, limiting search-path substitution.
- `ec_staging_checkout` uses `auth.uid()`, locks the buyer wallet and product row, checks seller verification/publication, stock, balance and arithmetic overflow; it rejects idempotency-key reuse with changed product/quantity.
- `ec_staging_cancel_order` filters the order by buyer ID, checks original debit and restores EC and stock on a permitted cancellation.
- `ec_staging_my_orders` and `ec_wallet_transactions` filter results to the authenticated owner.

## Findings and required follow-up
1. **RLS is enabled but has no explicit policies.** This currently complements denied direct table grants; it is not evidence of independently tested RLS tenant isolation. Preserve denied grants. Do not enable new grants without new policy tests.
2. **SECURITY DEFINER boundary:** review each function's owner and effective privileges, including internal helpers and trigger functions, before adding new RPCs. SQL source review is not a substitute for adversarial execution tests.
3. **Cancellation repeat behavior:** the function returns the original refund amount for an already cancelled order without writing a second credit. This is idempotent financially but the UI must not describe a repeat request as a fresh refund.
4. **EC ledger is not demonstrated as balanced double-entry:** signed per-wallet deltas exist, but the full issuance/liability and seller settlement invariant remains unproven.
5. **One-product checkout only:** existing staging order model cannot yet represent a normalized multi-item order; do not mutate existing tested flow to add it.
6. **Data boundary:** staging and production must remain separate; do not promote current RPCs to real-money authority or allow arbitrary top-ups.

## Next safe verification
- Read-only inspection of schema USAGE, function owners, constraints, unique indexes, foreign keys and trigger definitions.
- Prepare test cases for unauthenticated calls, cross-user order access, duplicate checkout, concurrent stock and repeated cancellations. Execute only with explicitly designated synthetic accounts, not real users.
- Draft additive schema/migration in GitHub only after the audit; migrations require a separate review and authorization.

**Go-live status: NO-GO.** Security controls observed are encouraging but incomplete as production evidence.
