/**
 * Echoes Response — offline coordinator transition regression tests.
 * Synthetic flags are not identity proof. No database, API or real staff.
 * Run: node docs/tests/echoes-response-coordinator-transition.test.mjs
 */
import assert from "node:assert/strict";
import { evaluateCoordinatorTransition } from "./echoes-response-coordinator-transition.mjs";

const current = () => ({ userId: "synthetic-target", status: "pending", version: 2 });
const command = () => ({
  to: "approved", expectedVersion: 2,
  actorId: "synthetic-reviewer-1",
  actorVerified: true, actorAuthorized: true, actorMfaVerified: true,
  auditReady: true, reasonCode: "training-complete",
  identityVetted: true, trainingVerified: true, jurisdictionVerified: true,
  safeguarding: true, secondReviewerId: "synthetic-reviewer-2",
  secondReviewerVerified: true, secondReviewerAuthorized: true,
  secondReviewerMfaVerified: true
});
let count = 0;
function check(label, alter, expected) {
  const row = current(), cmd = command();
  alter(row, cmd);
  const result = evaluateCoordinatorTransition(row, cmd);
  assert.equal(result.accepted, expected, label + ": " + result.reason);
  count++;
}
check("valid synthetic dual approval", () => {}, true);
check("self approval", (r,c) => { c.actorId = r.userId; }, false);
check("same reviewer twice", (r,c) => { c.secondReviewerId = c.actorId; }, false);
check("target as second reviewer", (r,c) => { c.secondReviewerId = r.userId; }, false);
check("missing second reviewer", (r,c) => { c.secondReviewerId = ""; }, false);
check("unverified second reviewer", (r,c) => { c.secondReviewerVerified = false; }, false);
check("unauthorized second reviewer", (r,c) => { c.secondReviewerAuthorized = false; }, false);
check("second reviewer MFA missing", (r,c) => { c.secondReviewerMfaVerified = false; }, false);
check("unauthorized first reviewer", (r,c) => { c.actorAuthorized = false; }, false);
check("first reviewer MFA missing", (r,c) => { c.actorMfaVerified = false; }, false);
check("staff not vetted", (r,c) => { c.identityVetted = false; }, false);
check("training missing", (r,c) => { c.trainingVerified = false; }, false);
check("jurisdiction missing", (r,c) => { c.jurisdictionVerified = false; }, false);
check("audit unavailable", (r,c) => { c.auditReady = false; }, false);
check("missing reason", (r,c) => { c.reasonCode = ""; }, false);
check("stale version", (r,c) => { c.expectedVersion = 1; }, false);
check("future version", (r,c) => { c.expectedVersion = 3; }, false);
check("revoked cannot be reapproved", (r,c) => { r.status = "revoked"; }, false);
check("pending cannot be suspended", (r,c) => { c.to = "suspended"; }, false);
check("approved can be suspended", (r,c) => { r.status = "approved"; c.to = "suspended"; }, true);
check("suspended can be revoked", (r,c) => { r.status = "suspended"; c.to = "revoked"; }, true);
check("revoked cannot be suspended", (r,c) => { r.status = "revoked"; c.to = "suspended"; }, false);
check("invalid state", (r,c) => { r.status = "unknown"; }, false);
check("invalid version", (r,c) => { r.version = -1; }, false);
check("missing actor", (r,c) => { c.actorId = ""; }, false);
console.log("PASS: " + count + " offline coordinator transition checks");
