/**
 * Offline synthetic audit-event validator regression tests.
 * Run: node docs/tests/echoes-response-coordinator-audit-event.test.mjs
 * These tests DO NOT prove real identity, approval, immutable storage, or atomicity.
 */
import assert from "node:assert/strict";
import { validateSyntheticCoordinatorAuditEvent as validate } from "./echoes-response-coordinator-audit-event.mjs";

const fixture = () => ({
  eventId: "event-001",
  transitionId: "transition-001",
  targetStaffId: "staff-target",
  actorId: "reviewer-one",
  secondReviewerId: "reviewer-two",
  requestId: "request-001",
  reasonCode: "training-verified",
  policyVersion: "policy-001",
  timestampSeconds: 1800000000,
  fromStatus: "pending",
  toStatus: "approved",
  previousVersion: 4,
  nextVersion: 5,
  highRiskApproval: true,
  decisionIds: ["decision-one", "decision-two"]
});
let passed = 0;
function check(label, edit, expected, reason) {
  const event = fixture();
  const edited = edit(event);
  const candidate = edited === undefined ? event : edited;
  const result = validate(candidate);
  assert.equal(result.valid, expected, label + " (result: " + result.reason + ")");
  if (reason) assert.equal(result.reason, reason, label + " reason");
  passed++;
}
check("valid synthetic high-risk event", () => {}, true, "synthetic_structure_only");
check("null event", () => null, false, "invalid_event");
check("array event", () => [], false, "invalid_event");
check("missing event id", e => { delete e.eventId; }, false, "missing_required_field");
check("invalid actor id", e => { e.actorId = "x"; }, false, "missing_or_invalid_metadata");
check("missing request id", e => { e.requestId = ""; }, false, "missing_or_invalid_metadata");
check("invalid timestamp", e => { e.timestampSeconds = -1; }, false, "missing_or_invalid_metadata");
check("same transition state", e => { e.toStatus = "pending"; }, false, "invalid_transition_metadata");
check("unknown status", e => { e.toStatus = "active"; }, false, "invalid_transition_metadata");
check("skipped version", e => { e.nextVersion = 6; }, false, "invalid_transition_metadata");
check("negative version", e => { e.previousVersion = -1; }, false, "invalid_transition_metadata");
check("self approval", e => { e.actorId = e.targetStaffId; }, false, "self_approval");
check("missing decisions", e => { e.decisionIds = []; }, false, "invalid_decision_references");
check("duplicate decisions", e => { e.decisionIds = ["decision-one", "decision-one"]; }, false, "invalid_decision_references");
check("one high-risk decision", e => { e.decisionIds = ["decision-one"]; }, false, "missing_independent_review");
check("no second reviewer", e => { delete e.secondReviewerId; }, false, "missing_independent_review");
check("same reviewer twice", e => { e.secondReviewerId = e.actorId; }, false, "missing_independent_review");
check("target is second reviewer", e => { e.secondReviewerId = e.targetStaffId; }, false, "missing_independent_review");
check("forbidden JWT", e => { e.jwt = "synthetic-secret"; }, false, "unexpected_field");
check("forbidden patient data", e => { e.patientData = "synthetic"; }, false, "unexpected_field");
check("forbidden precise location", e => { e.preciseLocation = "synthetic"; }, false, "unexpected_field");
check("standard non-high-risk event", e => { e.highRiskApproval = false; delete e.secondReviewerId; e.decisionIds = ["decision-one"]; }, true, "synthetic_structure_only");
check("unexpected benign field", e => { e.extra = "value"; }, false, "unexpected_field");
check("missing high-risk flag", e => { delete e.highRiskApproval; }, false, "missing_required_field");
check("invalid high-risk flag", e => { e.highRiskApproval = "false"; }, false, "invalid_risk_flag");
check("missing decision references", e => { delete e.decisionIds; }, false, "missing_required_field");
console.log("PASS: " + passed + " offline synthetic audit-event checks");
