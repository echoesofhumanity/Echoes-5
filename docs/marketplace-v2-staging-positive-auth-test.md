# Marketplace V2 staging positive authentication test

Scope: staging only. Production, EC balances and checkout remain unchanged.

1. Create a disposable staging Auth user through the Supabase dashboard. Do not share its password in chat or commit it.
2. Store test credentials in GitHub Actions repository secrets, never in source code.
3. Verify the staging Auth endpoint returns a user access token; do not log or print that token.
4. Call the staging Edge Function with the access token. Expected: HTTP 403, `identity_verified: true`, and `MARKETPLACE_V2_NOT_ENABLED`.
5. Confirm the staging database has zero persistent synthetic orders and wallets.

Negative JWT tests already run independently. A positive JWT test is not complete until its GitHub Actions run succeeds. Do not enable checkout or expose private RPCs.
