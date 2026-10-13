/**
 * Echoes Response — offline synthetic Ed25519 checkpoint regression tests.
 * No network, real keys, trusted anchor, operational authority or deployment.
 * Run: node docs/tests/echoes-response-synthetic-signed-checkpoint.test.mjs
 */
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createSyntheticSignedCheckpoint as signCheckpoint,
  verifySyntheticSignedCheckpoint as verifyCheckpoint,
  SYNTHETIC_CHECKPOINT_DOMAIN } from "./echoes-response-synthetic-signed-checkpoint.mjs";

const pair = generateKeyPairSync("ed25519");
const other = generateKeyPairSync("ed25519");
const envelope = () => ({
  domain: SYNTHETIC_CHECKPOINT_DOMAIN,
  environment: "staging-synthetic",
  projectId: "project-test", chainId: "chain-test",
  hashAlgorithm: "SHA-256", canonicalization: "fixed-fields-json-v1",
  index: 7, eventHash: "a".repeat(64), generation: 3,
  previousCheckpointDigest: "b".repeat(64),
  issuedAtSeconds: 1800000000, keyId: "key-test"
});
const trust = () => ({
  projectId: "project-test", chainId: "chain-test", keyId: "key-test",
  publicKey: pair.publicKey, minimumGeneration: 3, minimumIndex: 7
});
const signed = signCheckpoint(envelope(), pair.privateKey);
let passed = 0;
function check(name, checkpoint, trusted, expected, reason) {
  const result = verifyCheckpoint(checkpoint, trusted);
  assert.equal(result.verified, expected, name + " (" + result.reason + ")");
  if (reason) assert.equal(result.reason, reason, name + " reason");
  passed++;
}
function rejectedSigning(name, change) {
  const e = envelope(); change(e);
  assert.throws(() => signCheckpoint(e, pair.privateKey), /invalid_synthetic_checkpoint_envelope/, name);
  passed++;
}
check("valid signed checkpoint", signed, trust(), true, "synthetic_signature_only");
check("missing checkpoint", null, trust(), false, "invalid_checkpoint_or_trust");
check("missing trust", signed, null, false, "invalid_checkpoint_or_trust");
check("wrong public key", signed, { ...trust(), publicKey: other.publicKey }, false, "invalid_signature");
check("wrong project", signed, { ...trust(), projectId: "project-other" }, false, "trust_scope_mismatch");
check("wrong chain", signed, { ...trust(), chainId: "chain-other" }, false, "trust_scope_mismatch");
check("wrong key ID", signed, { ...trust(), keyId: "key-other" }, false, "trust_scope_mismatch");
check("stale generation", signed, { ...trust(), minimumGeneration: 4 }, false, "rollback_detected");
check("stale index", signed, { ...trust(), minimumIndex: 8 }, false, "rollback_detected");
check("tampered event hash", { ...signed, envelope: { ...signed.envelope, eventHash: "c".repeat(64) } }, trust(), false, "invalid_signature");
check("tampered generation", { ...signed, envelope: { ...signed.envelope, generation: 4 } }, trust(), false, "invalid_signature");
check("tampered timestamp", { ...signed, envelope: { ...signed.envelope, issuedAtSeconds: 1800000001 } }, trust(), false, "invalid_signature");
check("tampered previous digest", { ...signed, envelope: { ...signed.envelope, previousCheckpointDigest: "d".repeat(64) } }, trust(), false, "invalid_signature");
check("malformed signature", { ...signed, signature: "bad" }, trust(), false, "invalid_checkpoint_or_trust");
check("unexpected checkpoint field", { ...signed, secret: "synthetic" }, trust(), false, "invalid_checkpoint_or_trust");
check("unexpected envelope field", { ...signed, envelope: { ...signed.envelope, extra: "synthetic" } }, trust(), false, "invalid_envelope");
check("forged domain", { ...signed, envelope: { ...signed.envelope, domain: "wrong-domain" } }, trust(), false, "invalid_envelope");
check("forged environment", { ...signed, envelope: { ...signed.envelope, environment: "production" } }, trust(), false, "invalid_envelope");
check("missing public key", signed, { ...trust(), publicKey: null }, false, "invalid_checkpoint_or_trust");
check("invalid minimum generation", signed, { ...trust(), minimumGeneration: -1 }, false, "invalid_checkpoint_or_trust");
rejectedSigning("invalid event hash", e => { e.eventHash = "invalid"; });
rejectedSigning("missing key ID", e => { delete e.keyId; });
rejectedSigning("negative index", e => { e.index = -1; });
rejectedSigning("invalid canonicalization", e => { e.canonicalization = "json"; });
assert.equal(verifyCheckpoint(signed, trust()).checkpointDigest.length, 64); passed++;
console.log("PASS: " + passed + " offline synthetic signed-checkpoint checks");
