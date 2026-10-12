# Merchandise public catalog — access contract (draft)

Status: architecture only. No Supabase policy, view, function, grant or frontend API call is enabled by this document.

## Current boundary
- `public.echoes_creators`, `public.echoes_products` and `public.echoes_product_variants` remain protected by RLS and have no public policies.
- The four existing merchandise records are **concepts**, with no verified maker, no available inventory and checkout disabled.
- `assets/data/merchandise-catalog.json` is a public, non-sensitive concept identity map; it is not proof of inventory or creator approval.
- The browser must never receive a service-role key, private consent records or unpublished biographies.

## Future public projection
Introduce a dedicated, least-privilege read interface **only after review**. It must return a deliberate allowlist:
- stable public product identifier and concept identifier;
- approved public title and description;
- public product/variant display information only when explicitly approved;
- public maker name/story only after verification and documented, unrevoked consent;
- published/unavailable status, with checkout disabled until a separate commercial launch.

Never expose private creator verification evidence, consent timestamps or versions, internal reviewer notes, financial settlement fields, unpublished rows or raw administrative tables.

## Publication gates
1. Product status is published, with independent editorial approval.
2. Creator is verified, creator publication status is published, and consent is current and not revoked.
3. Product claims, imagery, production provenance and variants have been reviewed.
4. Withdrawal, suspension or revocation must remove the corresponding public data.
5. No checkout, payment or order capability is implied by catalog visibility.

## Implementation sequence
1. Review the existing database schema and RLS before any DDL.
2. Design and test a minimal read-only projection with database-enforced publication gates; explicitly account for Postgres view security and role grants.
3. Test anonymous and authenticated access: drafts and concepts must be inaccessible; only approved records may be returned.
4. Add a separate browser reader with graceful fallback to the four existing concept cards.
5. Enable the read path on Merchandise only after security and visual tests.

Admin V3, backup repositories and unrelated Supabase tables remain out of scope. Every implementation step requires a separate change and test.
