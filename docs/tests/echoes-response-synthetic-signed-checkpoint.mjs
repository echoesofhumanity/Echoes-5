/**
 * Echoes Response — OFFLINE SYNTHETIC signed checkpoint prototype.
 * No network, database, real identities, persistent keys, trusted clock or custody.
 * Ed25519 private keys are test-only and supplied by the caller; NEVER deploy this.
 */
import { createHash, sign, verify, timingSafeEqual } from "node:crypto";

const DOMAIN = "echoes-response-synthetic-checkpoint-v1";
const fields = ["domain", "environment", "projectId", "chainId", "hashAlgorithm",
  "canonicalization", "index", "eventHash", "generation", "previousCheckpointDigest",
  "issuedAtSeconds", "keyId"];
const identifier = value => typeof value === "string" &&
  /^[A-Za-z0-9_-]{3,96}$/.test(value);
const digest = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const deny = reason => Object.freeze({ verified: false, reason });
const exactKeys = (obj, allowed) => obj && typeof obj === "object" &&
  !Array.isArray(obj) && Object.keys(obj).length === allowed.length &&
  Object.keys(obj).every(key => allowed.includes(key)) &&
  allowed.every(key => Object.hasOwn(obj, key));
const safeInteger = value => Number.isSafeInteger(value) && value >= 0;

/**
 * Fixed-order UTF-8 serialization for this JS-only synthetic protocol.
 * Each field is encoded as a JSON string or a base-10 safe integer.
 * Cross-language canonicalization requires independent review.
 */
function serialize(envelope) {
  if (!exactKeys(envelope, fields) || envelope.domain !== DOMAIN ||
      !["staging-synthetic"].includes(envelope.environment) ||
      !identifier(envelope.projectId) || !identifier(envelope.chainId) ||
      !identifier(envelope.keyId) ||
      envelope.hashAlgorithm !== "SHA-256" ||
      envelope.canonicalization !== "fixed-fields-json-v1" ||
      !safeInteger(envelope.index) || !safeInteger(envelope.generation) ||
      !safeInteger(envelope.issuedAtSeconds) || envelope.issuedAtSeconds === 0 ||
      !digest(envelope.eventHash) ||
      !digest(envelope.previousCheckpointDigest))
    throw new TypeError("invalid_synthetic_checkpoint_envelope");
  return Buffer.from(fields.map(key => JSON.stringify(envelope[key])).join("\n"), "utf8");
}
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function createSyntheticSignedCheckpoint(envelope, testPrivateKey) {
  const bytes = serialize(envelope);
  const signature = sign(null, bytes, testPrivateKey).toString("base64url");
  return Object.freeze({ envelope: Object.freeze({ ...envelope }), signature });
}

export function verifySyntheticSignedCheckpoint(checkpoint, trust) {
  if (!exactKeys(checkpoint, ["envelope", "signature"]) ||
      !trust || typeof trust !== "object" ||
      !identifier(trust.projectId) || !identifier(trust.chainId) ||
      !identifier(trust.keyId) || !trust.publicKey ||
      !safeInteger(trust.minimumGeneration) ||
      !safeInteger(trust.minimumIndex) ||
      typeof checkpoint.signature !== "string" ||
      !/^[A-Za-z0-9_-]{86}$/.test(checkpoint.signature))
    return deny("invalid_checkpoint_or_trust");
  let bytes;
  try { bytes = serialize(checkpoint.envelope); }
  catch { return deny("invalid_envelope"); }
  const e = checkpoint.envelope;
  if (e.projectId !== trust.projectId || e.chainId !== trust.chainId ||
      e.keyId !== trust.keyId)
    return deny("trust_scope_mismatch");
  if (e.generation < trust.minimumGeneration || e.index < trust.minimumIndex)
    return deny("rollback_detected");
  try {
    const signature = Buffer.from(checkpoint.signature, "base64url");
    if (signature.length !== 64 ||
        !verify(null, bytes, trust.publicKey, signature))
      return deny("invalid_signature");
  } catch { return deny("invalid_signature"); }
  return Object.freeze({ verified: true, reason: "synthetic_signature_only",
    checkpointDigest: sha256(bytes), index: e.index, eventHash: e.eventHash,
    generation: e.generation });
}

export const SYNTHETIC_CHECKPOINT_DOMAIN = DOMAIN;
