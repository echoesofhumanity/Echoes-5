# Echoes EC — GitHub application integration audit
Date: 17 October 2026
Repository: echoesofhumanity/Echoes-5, main
Status: read-only code review; no live system changes.

## Confirmed code path
- `ec-wallet-preview.html` imports supabase-js v2 and creates a client using the staging Supabase URL and a publishable browser key.
- It invokes `ec_wallet_snapshot` and `ec_wallet_transactions` through `client.rpc`.
- Transaction history displays the raw operation identifier with underscores replaced by spaces. V2 debit and reversal names would be exposed as technical labels rather than properly translated descriptions.
- The inspected page contains no direct insert, update or delete operation against `ec_wallet.ledger`.

## Repository search scope and limits
GitHub code search on main for `ec_wallet`, `ec_staging_checkout`, `service_role`, `ledger` and `ec_wallet_transactions` returned documentation, staging SQL drafts, the wallet preview and a synthetic JWT test reference. A code search is not a complete enumeration of deployed services, ignored files, external automations or privileged credentials. The presence of the string `service_role` in a JWT negative test is not evidence of a deployed service-role writer.

## V2 presentation requirements
- Map every approved operation code to localized, human-readable history labels; unknown codes must use a safe generic fallback without inventing a transaction meaning.
- Preserve amount sign and timestamp, avoid calling a repeated cancellation a new refund.
- Keep publishable browser credentials distinct from service-role secrets; privileged keys must never be placed in GitHub Pages frontend.
- Do not activate V2 checkout from the wallet preview until backend authorization, ledger constraints and synthetic acceptance gates are satisfied.

## Remaining work
1. Audit all repository checkout/cart pages and JavaScript RPC usage, not only wallet preview.
2. Inventory deployed edge functions and external service-role writers separately.
3. Confirm ledger trigger and constraint definitions from authoritative database catalog evidence.
4. Review six-language labels and RTL presentation after operation taxonomy is approved.

**NO-GO:** No direct EC issuance, production commerce or V2 checkout activation authorized.
