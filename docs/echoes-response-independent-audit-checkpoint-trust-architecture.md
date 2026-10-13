# Echoes Response — Independent Audit Checkpoint Trust Architecture
**Design draft 01 · 2026-10-13 · REVIEW ONLY / NO-GO**

## Purpose and non-operational boundary
Define how a future independent verifier could detect unauthorized rewriting, truncation, or rollback of the coordinator audit chain. This is a **design specification**, not a deployed checkpoint service. No Supabase migration, credentials, cloud resources, case records, real staff enrollment, API endpoint, or operational authority is created. Production Echoes-5, backups, and the existing production Supabase project remain untouched.

## Threat model
A compromised application writer, privileged database operator, or compromised backup may modify both an event and its locally stored SHA-256 chain. A hash chain without an independently held, authenticated checkpoint **cannot** distinguish an entirely rewritten chain from an authentic one. An attacker may also replay an old valid checkpoint, suppress a new checkpoint, replace a verifier's trust key, or forge timestamps. Cryptographic evidence is not proof that the original human approval was legitimate.

## Separation of duties
- **Event writer (future):** narrowly scoped transaction executor; writes validated audit events with coordinator state changes atomically; cannot edit or delete prior committed events.
- **Checkpoint publisher (future):** read-only audit-chain follower with a separately controlled signing identity; does not hold coordinator approval or roster-write privileges.
- **Independent anchor custodian (future):** separate administrative/security domain; accepts only authenticated monotonic checkpoint updates, durably retains prior checkpoints, and denies overwrite/rollback. Do not use the same project admin or same mutable storage as the event writer.
- **Independent verifier (future):** read-only; uses a pinned, out-of-band verified public key and the custodian's latest authenticated checkpoint. Must not trust checkpoint or key material supplied alongside the untrusted chain.

## Proposed checkpoint envelope (version 1)
A checkpoint should bind: protocol/domain identifier, environment and project identifier, chain identifier, hash algorithm and canonicalization version, last committed sequence/index, last event hash, checkpoint generation counter, previous checkpoint digest, server-generated issuance time, signing key ID, and an authenticated signature over a precisely specified canonical byte representation. Future implementation must define and test that representation byte-for-byte (including UTF-8, field order, integer encoding, and domain separation); JSON serialization alone is not a cross-language standard. The timestamp is descriptive only unless separately time-attested.

Keep only minimal integrity metadata; do **not** include names, case narratives, patient details, exact locations, passwords, JWTs, or private keys.

## Publishing and verification contract
1. Publish only after the database transaction is committed and its complete audit prefix is read back consistently; a pending event is never anchored.
2. Authenticate the publisher through independently managed workload identity. Enforce distinct publisher and writer permissions; verify signing key custody and rotation policy.
3. Sign the checkpoint envelope using a reviewed asymmetric signature scheme and protect private keys outside the application/database trust domain. Define algorithm allowlists and reject algorithm substitution.
4. The custodian verifies publisher identity, signature, environment, chain ID, monotonic generation/index and linkage to the prior accepted checkpoint. Preserve a durable history and issue an authenticated receipt. A duplicate may be idempotent only if all fields match exactly; conflicting duplicates fail closed.
5. The verifier retrieves the latest custodian-authenticated checkpoint through a trusted channel, checks pinned key identity, signature, domain, chain ID, generation, continuity and hash-chain prefix. Reject gaps, rollback, truncation, altered events, unknown keys, stale checkpoints and inconsistent receipts.
6. For freshness, enforce an explicitly approved maximum checkpoint age and publication schedule. If freshness cannot be established, mark integrity **unknown / unavailable**, never silently successful.
7. If event storage and independent anchor disagree, stop sensitive coordinator approval workflows and escalate to human security/safeguarding review. Do not auto-repair by rewriting history.

## Failure and recovery
- **Publisher unavailable:** buffer no private user data in client storage; alert on missed publication and enforce a documented fail-closed threshold.
- **Custodian unavailable:** do not substitute a local database hash as an independent anchor. Show unverified state and apply the approved operational safety policy.
- **Key rotation or compromise:** use preauthorized, independently witnessed rotation records; revoke compromised keys, retain historical verification evidence and define an incident investigation boundary. No silent trust-on-first-use.
- **Backup restore:** compare restored event prefix against externally retained anchors before enabling any sensitive workflow; refuse rollback or forked history.
- **Privacy/retention:** define jurisdiction-specific retention, lawful erasure and evidence preservation; do not promise perpetual storage. Document how deletions are authorized and independently accounted for without exposing sensitive content.

## Required negative tests before any implementation
Tampered event and recomputed local chain; removed/reordered events; shortened chain; stale signed checkpoint; forged signature; swapped signing key; cross-project or cross-chain replay; repeated generation with conflicting digest; checkpoint gap; compromised publisher; custodian rollback; unavailable custodian; backup restore from old snapshot; missing trusted time; concurrent publisher updates; key rotation; disclosure of sensitive fields. Add fault-injection tests for interrupted commits and publisher retries.

## Independent review and go/no-go
Security, safeguarding, privacy/legal and operations reviewers must independently approve the identity boundaries, keys, canonical bytes, custody, monitoring, retention, incident handling, test evidence and rollout. Until then: **NO-GO** for real approval authority, operational case intake, public SOS/missing reporting or claims of tamper-proof storage.

## Safe next development step
Specify a **fully offline synthetic signed-checkpoint envelope and negative-test plan**. It must use generated test keys only and must not contact Supabase or establish a real trust anchor.
