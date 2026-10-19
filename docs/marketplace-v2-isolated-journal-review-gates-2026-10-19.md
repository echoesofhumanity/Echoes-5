# Marketplace V2 — isolated journal draft review gates
2026-10-19 · NO-GO · Review only

## New draft
`docs/sql/marketplace-v2-isolated-synthetic-wallet-journal.REVIEW.sql` defines isolated test wallets and an append-only journal, with RLS enabled and forced, public/anon/authenticated/service_role access revoked, and a first-statement blocking RAISE EXCEPTION. It is **not executable as an approved migration**.

## Open findings requiring remediation before any installation
1. The wallet `opening_ec` and `balance_ec` columns can be initialized inconsistently; a trusted initialization guard is required.
2. A row-level journal mutation trigger does not stop TRUNCATE or privileged bypass. Table ownership, grants, function execution and TRUNCATE must be reviewed.
3. Journal uniqueness is per wallet/order/operation and wallet/request key; concurrency/idempotency tests remain mandatory.
4. Wallet balance and journal sums are not yet transactionally reconciled. A deferred constraint/controlled writer strategy must be reviewed.
5. The journal FK references a V2 orders table that does not exist in staging. All dependencies need an isolated ordered migration manifest.
6. No authenticated public RPC or real-wallet bridge is approved; synthetic identities must not be presented as real EC balances.
7. The first-statement review exception must stay in place. Never execute these SQL drafts on production or staging.

## Verified evidence
GitHub Actions run 39174232478: 15 offline synthetic tests and legacy SQL fail-closed checks passed. This new draft has **not yet** been covered by CI or PostgreSQL runtime tests.

**Release decision: NO-GO.**
