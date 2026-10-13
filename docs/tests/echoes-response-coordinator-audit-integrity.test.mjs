/**
 * Offline synthetic SHA-256 audit chain regression checks.
 * No independent trust anchor, signatures, immutable storage or real staff data.
 * Run: node docs/tests/echoes-response-coordinator-audit-integrity.test.mjs
 */
import assert from "node:assert/strict";
import { createSyntheticAuditChain, verifySyntheticAuditChain } from "./echoes-response-coordinator-audit-integrity.mjs";

const event = (n) => ({
  eventId: "event-" + n, transitionId: "transition-" + n,
  targetStaffId: "staff-target", actorId: "reviewer-one",
  secondReviewerId: "reviewer-two", requestId: "request-" + n,
  reasonCode: "training-verified", policyVersion: "policy-001",
  timestampSeconds: 1800000000 + n, fromStatus: "pending",
  toStatus: "approved", previousVersion: n, nextVersion: n + 1,
  highRiskApproval: true, decisionIds: ["decision-" + n + "-a", "decision-" + n + "-b"]
});
const chain = createSyntheticAuditChain([event(1), event(2), event(3)]);
const checkpoint = { index: 2, eventHash: chain[2].eventHash };
let passed = 0;
const expect = (name, candidate, anchor, valid, reason) => {
  const result = verifySyntheticAuditChain(candidate, anchor);
  assert.equal(result.valid, valid, name + ": " + result.reason);
  if (reason) assert.equal(result.reason, reason, name + " reason");
  passed++;
};
const copy = () => structuredClone(chain);
expect("valid chain with supplied checkpoint", chain, checkpoint, true, "synthetic_hash_chain_matches_checkpoint_only");
expect("empty chain", [], checkpoint, false, "invalid_chain_or_checkpoint");
expect("missing checkpoint", chain, null, false, "invalid_chain_or_checkpoint");
expect("truncated chain", chain.slice(0, 2), checkpoint, false, "invalid_chain_or_checkpoint");
expect("wrong checkpoint index", chain, { ...checkpoint, index: 1 }, false, "invalid_chain_or_checkpoint");
expect("wrong checkpoint hash", chain, { ...checkpoint, eventHash: "f".repeat(64) }, false, "checkpoint_mismatch");
expect("invalid checkpoint hash format", chain, { ...checkpoint, eventHash: "invalid" }, false, "invalid_chain_or_checkpoint");
{
  const altered = copy(); altered[1].event.reasonCode = "changed-reason";
  expect("changed event payload", altered, checkpoint, false, "hash_mismatch");
}
{
  const altered = copy(); altered[1].event.jwt = "fake";
  expect("injected unknown sensitive field", altered, checkpoint, false, "invalid_or_duplicate_event");
}
{
  const altered = copy(); altered[1].event.eventId = altered[0].event.eventId;
  expect("duplicate event id", altered, checkpoint, false, "invalid_or_duplicate_event");
}
{
  const altered = copy(); altered[1].event.transitionId = altered[0].event.transitionId;
  expect("duplicate transition id", altered, checkpoint, false, "invalid_or_duplicate_event");
}
{
  const altered = copy(); altered[1].previousHash = "a".repeat(64);
  expect("forged previous link", altered, checkpoint, false, "broken_chain");
}
{
  const altered = copy(); altered[1].eventHash = "a".repeat(64);
  expect("forged event hash", altered, checkpoint, false, "hash_mismatch");
}
{
  const altered = copy(); [altered[0], altered[1]] = [altered[1], altered[0]];
  expect("reordered events", altered, checkpoint, false, "broken_chain");
}
{
  const altered = copy(); altered.splice(1, 1);
  expect("deleted middle event", altered, checkpoint, false, "invalid_chain_or_checkpoint");
}
{
  const altered = copy(); altered[1].index = 5;
  expect("forged sequence number", altered, checkpoint, false, "broken_chain");
}
{
  const altered = copy(); altered[1].event.decisionIds[0] = "changed-decision";
  expect("modified nested decision reference", altered, checkpoint, false, "hash_mismatch");
}
assert.throws(() => createSyntheticAuditChain([]), /nonempty_events_required/); passed++;
assert.throws(() => createSyntheticAuditChain([event(1), event(1)]), /duplicate_event_or_transition/); passed++;
assert.throws(() => createSyntheticAuditChain([{ ...event(1), jwt: "fake" }]), /invalid_event_unexpected_field/); passed++;
console.log("PASS: " + passed + " offline synthetic audit integrity checks");
