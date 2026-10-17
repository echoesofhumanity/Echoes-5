# Marketplace V2 — Frontend checkout integration boundary audit
Date: 17 October 2026
Repository: echoesofhumanity/Echoes-5 / main
Status: Code inspection only. No changes to running checkout.

## Verified page-level paths
- `marketplace.html`: portal Marketplace page; no direct Supabase checkout call in the inspected HTML.
- `merchandise.html`: localized conceptual products and demo-cart interactions. No direct staging checkout RPC in the inspected HTML. A product guard checks `checkout_enabled === false` before enabling purchase-like controls.
- `ec-checkout-test.html`: separate authenticated staging test page, with Supabase publishable browser key. Calls `ec_staging_catalogue`, `ec_staging_my_orders`, `ec_staging_checkout` and `ec_staging_cancel_order`.
- `ec-wallet-preview.html`: reads `ec_wallet_snapshot` and `ec_wallet_transactions`, without direct ledger writes in inspected page.

## Important checkout observations
- Test checkout submits exactly one item with quantity 1, using a new `crypto.randomUUID()` on each click.
- The button has an in-page `busy` guard, but generating a fresh idempotency key for each click is not a durable retry protocol after a lost response or page reload.
- Staging cancellation is invoked for an existing order ID. The current backend returns the original refund amount for a repeated cancellation; the UI must not describe a replay as a new credit.
- Browser calls are not sufficient authorization. The server must validate identity, price, seller, stock, balance, idempotency and ownership.

## V2 integration boundary
1. Keep the existing single-item test checkout unchanged.
2. Keep conceptual Marketplace/Merchandise demo cart separate from authorized staging products; never trust browser product IDs, prices or seller IDs.
3. Define a dedicated V2 staging checkout endpoint and explicitly mapped eligible staging catalogue before enabling any demo-to-checkout action.
4. Persist a request key only for the duration of an intentional retryable checkout request; use a new key for a genuinely new order. Server digest validation remains authoritative.
5. Do not connect a production payment provider or permit service-role secrets in frontend code.
6. Map V2 transaction operations to six-language human-readable labels after backend operations are approved.

## Next verification
Trace shared demo-cart JavaScript, cart storage limits and eligibility flags. Separately audit deployed privileged functions and all EC ledger writers. Execute synthetic tests only after reviewed migration and explicit authorization.

**NO-GO:** No V2 purchase enabled. No production system change.
