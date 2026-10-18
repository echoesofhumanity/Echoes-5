# Marketplace V2 — staging schema reality check
2026-10-19 · READ ONLY · NO-GO

Supabase staging project **ymxpbkviadypsvahrqwt** was queried using information_schema and pg_catalog metadata only. No DDL, DML, migrations, RPC calls or test writes occurred. Production project and backup repository were not accessed.

## Observed
- Existing `ec_wallet.wallets` columns: wallet_id, owner_id, created_at.
- Existing `ec_wallet.ledger` columns: entry_id, wallet_id, delta_ec, operation, reference_id, idempotency_key, recorded_at.
- Existing matching legacy staging tables: `ec_wallet.staging_products`, `ec_wallet.staging_sellers`, `ec_wallet.staging_seller_payables`.
- **No** `ec_wallet.staging_*_v2` tables appeared in information_schema query.
- The function-name metadata search for cart V2 / unsplit functions did not show matches in the retrieved result. Verify function visibility separately if needed.
- GitHub's V2 SQL files are review-only drafts and are not evidence of deployed schema.

## Consequences
- V2 multi-item checkout/cancel and UNSPLIT clearing **cannot** be integration-tested against the current staging schema without separately approved schema installation.
- Do not reuse legacy `staging_products` or `staging_seller_payables` as if they were independent V2 fixtures.
- Maintain fail-closed SQL draft guards; no SQL execution or staging mutation is approved.
- Next step is offline schema/constraint reconciliation and a disposable database test harness proposal, followed by explicit authorization before any staging write.

## CI evidence
GitHub Actions run 39174232478: 15 synthetic reference tests and static SQL draft checks passed. This is **not** PostgreSQL validation.
