/**
 * Echoes Response — offline synthetic integrated audit verification tests.
 * Test keys are ephemeral. No network, Supabase, staff data or trusted custodian.
 * Run: node docs/tests/echoes-response-synthetic-anchored-audit-verifier.test.mjs
 */
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createSyntheticAuditChain } from "./echoes-response-coordinator-audit-integrity.mjs";
import { createSyntheticSignedCheckpoint, SYNTHETIC_CHECKPOINT_DOMAIN } from "./echoes-response-synthetic-signed-checkpoint.mjs";
import { verifySyntheticAnchoredAuditChain as verify } from "./echoes-response-synthetic-anchored-audit-verifier.mjs";

const key = generateKeyPairSync("ed25519");
const otherKey = generateKeyPairSync("ed25519");
const event = n => ({
  eventId: "event-" + n, transitionId: "transition-" + n,
  targetStaffId: "staff-target", actorId: "reviewer-one",
  secondReviewerId: "reviewer-two", requestId: "request-" + n,
  reasonCode: "training-verified", policyVersion: "policy-001",
  timestampSeconds: 1800000000 + n, fromStatus: "pending",
  toStatus: "approved", previousVersion: n, nextVersion: n + 1,
  highRiskApproval: true, decisionIds: ["decision-" + n + "-a", "decision-" + n + "-b"]
});
const chain = createSyntheticAuditChain([event(1), event(2), event(3)]);
const envelope = {
  domain: SYNTHETIC_CHECKPOINT_DOMAIN, environment: "staging-synthetic",
  projectId: "project-test", chainId: "chain-test",
  hashAlgorithm: "SHA-256", canonicalization: "fixed-fields-json-v1",
  index: chain.length - 1, eventHash: chain.at(-1).eventHash,
  generation: 3, previousCheckpointDigest: "0".repeat(64),
  issuedAtSeconds: 1800000000, keyId: "key-test"
};
const checkpoint = createSyntheticSignedCheckpoint(envelope, key.privateKey);
const trust = {
  projectId: "project-test", chainId: "chain-test", keyId: "key-test",
  publicKey: key.publicKey, minimumGeneration: 3, minimumIndex: 2
};
let passed = 0;
function check(name, c, cp, t, expected, reason) {
  const result = verify(c, cp, t);
  assert.equal(result.verified, expected, name + ": " + result.reason);
  if (reason) assert.equal(result.reason, reason, name + " reason");
  passed++;
}
const clone = () => structuredClone(chain);
check("valid integrated chain and signed checkpoint", chain, checkpoint, trust, true, "synthetic_signature_and_chain_match_only");
check("missing independent trust", chain, checkpoint, null, false, "independent_trust_required");
check("missing public key", chain, checkpoint, { ...trust, publicKey: null }, false, "independent_trust_required");
check("wrong public key", chain, checkpoint, { ...trust, publicKey: otherKey.publicKey }, false, "checkpoint_invalid_signature");
check("wrong project", chain, checkpoint, { ...trust, projectId: "project-other" }, false, "checkpoint_trust_scope_mismatch");
check("wrong chain ID", chain, checkpoint, { ...trust, chainId: "chain-other" }, false, "checkpoint_trust_scope_mismatch");
check("wrong signing key ID", chain, checkpoint, { ...trust, keyId: "key-other" }, false, "checkpoint_trust_scope_mismatch");
check("old checkpoint generation", chain, checkpoint, { ...trust, minimumGeneration: 4 }, false, "checkpoint_rollback_detected");
check("old checkpoint index", chain, checkpoint, { ...trust, minimumIndex: 3 }, false, "checkpoint_rollback_detected");
check("missing checkpoint", chain, null, trust, false, "checkpoint_invalid_checkpoint_or_trust");
check("tampered signed hash", chain, { ...checkpoint, envelope: { ...checkpoint.envelope, eventHash: "f".repeat(64) } }, trust, false, "checkpoint_invalid_signature");
{
  const changed = clone(); changed[1].event.reasonCode = "modified-reason";
  check("modified event with valid signature", changed, checkpoint, trust, false, "chain_hash_mismatch");
}
{
  const changed = clone(); changed[1].event.decisionIds[0] = "modified-decision";
  check("modified decision with valid signature", changed, checkpoint, trust, false, "chain_hash_mismatch");
}
{
  const changed = clone(); changed[1].event.jwt = "synthetic";
  check("sensitive field injected", changed, checkpoint, trust, false, "chain_invalid_or_duplicate_event");
}
{
  const changed = clone(); changed[1].previousHash = "a".repeat(64);
  check("broken previous hash", changed, checkpoint, trust, false, "chain_broken_chain");
}
{
  const changed = clone(); changed[1].eventHash = "a".repeat(64);
  check("forged intermediate hash", changed, checkpoint, trust, false, "chain_hash_mismatch");
}
{
  const changed = clone(); [changed[0], changed[1]] = [changed[1], changed[0]];
  check("reordered records", changed, checkpoint, trust, false, "chain_broken_chain");
}
check("truncated records", chain.slice(0, 2), checkpoint, trust, false, "chain_invalid_chain_or_checkpoint");
check("empty records", [], checkpoint, trust, false, "chain_invalid_chain_or_checkpoint");
{
  const changed = clone(); changed[1].event.eventId = changed[0].event.eventId;
  check("duplicate event identity", changed, checkpoint, trust, false, "chain_invalid_or_duplicate_event");
}
{
  const changed = clone(); changed[1].event.transitionId = changed[0].event.transitionId;
  check("duplicate transition identity", changed, checkpoint, trust, false, "chain_invalid_or_duplicate_event");
}
{
  const changed = clone(); changed[1].index = 7;
  check("wrong sequence index", changed, checkpoint, trust, false, "chain_broken_chain");
}
{
  const signedForOtherHash = createSyntheticSignedCheckpoint(
    { ...envelope, eventHash: "e".repeat(64) }, key.privateKey);
  check("valid signature but wrong chain hash", chain, signedForOtherHash, trust, false, "chain_checkpoint_mismatch");
}
{
  const shorter = createSyntheticAuditChain([event(1), event(2)]);
  const signedForShorter = createSyntheticSignedCheckpoint({
    ...envelope, index: 1, eventHash: shorter.at(-1).eventHash, generation: 4
  }, key.privateKey);
  check("authentic older prefix rejected by index floor", shorter, signedForShorter, trust, false, "checkpoint_rollback_detected");
}
console.log("PASS: " + passed + " offline synthetic anchored-audit integration checks");
