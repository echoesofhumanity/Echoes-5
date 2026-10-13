/**
 * Echoes Response — offline synthetic signed-checkpoint + audit-chain verifier.
 * REVIEW ONLY: the trust object MUST originate independently of untrusted data.
 * No anchor custody, durable anti-rollback, signature-key management or network.
 */
import { verifySyntheticSignedCheckpoint } from "./echoes-response-synthetic-signed-checkpoint.mjs";
import { verifySyntheticAuditChain } from "./echoes-response-coordinator-audit-integrity.mjs";

const deny = reason => Object.freeze({ verified: false, reason });

/**
 * The signed checkpoint is required to cover the complete supplied chain.
 * This deliberately does not support partial-prefix or incremental verification.
 * An independent custodian must provide the trust key and anti-rollback floor.
 */
export function verifySyntheticAnchoredAuditChain(chain, signedCheckpoint, independentTrust) {
  if (!independentTrust || typeof independentTrust !== "object" ||
      !independentTrust.publicKey)
    return deny("independent_trust_required");

  const signature = verifySyntheticSignedCheckpoint(signedCheckpoint, independentTrust);
  if (!signature.verified)
    return deny("checkpoint_" + signature.reason);

  const integrity = verifySyntheticAuditChain(chain, {
    index: signature.index,
    eventHash: signature.eventHash
  });
  if (!integrity.valid)
    return deny("chain_" + integrity.reason);

  return Object.freeze({
    verified: true,
    reason: "synthetic_signature_and_chain_match_only",
    index: signature.index,
    generation: signature.generation,
    checkpointDigest: signature.checkpointDigest
  });
}
