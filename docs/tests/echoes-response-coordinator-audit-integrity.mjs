/**
 * Echoes Response — offline synthetic audit integrity chain.
 * REVIEW ONLY. SHA-256 hash chaining detects accidental or adversarial
 * modifications only when an independently trusted checkpoint is retained.
 * No signature, secure timestamp, storage immutability, database or network.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { validateSyntheticCoordinatorAuditEvent } from "./echoes-response-coordinator-audit-event.mjs";

const hex64 = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const deny = reason => Object.freeze({ valid: false, reason });
const canonical = event => {
  const sorted = {};
  for (const key of Object.keys(event).sort()) sorted[key] = event[key];
  return JSON.stringify(sorted);
};
const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");
const equalHash = (a, b) => hex64(a) && hex64(b) &&
  timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));

export function createSyntheticAuditChain(events) {
  if (!Array.isArray(events) || events.length === 0)
    throw new TypeError("nonempty_events_required");
  let previousHash = "0".repeat(64);
  const seenEvents = new Set();
  const seenTransitions = new Set();
  return Object.freeze(events.map((event, index) => {
    const result = validateSyntheticCoordinatorAuditEvent(event);
    if (!result.valid) throw new TypeError("invalid_event_" + result.reason);
    if (seenEvents.has(event.eventId) || seenTransitions.has(event.transitionId))
      throw new TypeError("duplicate_event_or_transition");
    seenEvents.add(event.eventId);
    seenTransitions.add(event.transitionId);
    const eventHash = sha256("echoes-response-audit-v1\n" + index + "\n" +
      previousHash + "\n" + canonical(event));
    const item = Object.freeze({
      index, previousHash, event: Object.freeze({ ...event, decisionIds: Object.freeze([...event.decisionIds]) }),
      eventHash
    });
    previousHash = eventHash;
    return item;
  }));
}

export function verifySyntheticAuditChain(chain, trustedCheckpoint) {
  if (!Array.isArray(chain) || chain.length === 0 ||
      !trustedCheckpoint || typeof trustedCheckpoint !== "object" ||
      !Number.isSafeInteger(trustedCheckpoint.index) ||
      trustedCheckpoint.index !== chain.length - 1 ||
      !hex64(trustedCheckpoint.eventHash))
    return deny("invalid_chain_or_checkpoint");
  let previousHash = "0".repeat(64);
  const seenEvents = new Set();
  const seenTransitions = new Set();
  for (let index = 0; index < chain.length; index++) {
    const item = chain[index];
    if (!item || typeof item !== "object" || item.index !== index ||
        !equalHash(item.previousHash, previousHash) ||
        !item.event || typeof item.event !== "object")
      return deny("broken_chain");
    const event = item.event;
    if (!validateSyntheticCoordinatorAuditEvent(event).valid ||
        seenEvents.has(event.eventId) || seenTransitions.has(event.transitionId))
      return deny("invalid_or_duplicate_event");
    seenEvents.add(event.eventId);
    seenTransitions.add(event.transitionId);
    const expected = sha256("echoes-response-audit-v1\n" + index + "\n" +
      previousHash + "\n" + canonical(event));
    if (!equalHash(item.eventHash, expected))
      return deny("hash_mismatch");
    previousHash = expected;
  }
  if (!equalHash(previousHash, trustedCheckpoint.eventHash))
    return deny("checkpoint_mismatch");
  return Object.freeze({ valid: true, reason: "synthetic_hash_chain_matches_checkpoint_only" });
}
