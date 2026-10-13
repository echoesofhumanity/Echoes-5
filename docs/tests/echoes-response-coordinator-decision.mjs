/**
 * Echoes Response — coordinator decision kernel (STAGING REFERENCE ONLY).
 * No network, database, API route or privileges. Inputs MUST be independently
 * verified by a trusted server; caller-supplied booleans are never proof.
 * This is not sufficient to authorize real-case access or deployment.
 */
export function assessCoordinatorAccess(input) {
  const deny = (reason) => Object.freeze({ allowed: false, reason });
  if (!input || typeof input !== "object") return deny("invalid_input");
  const { actor, caseRecord, assignment, request, now } = input;
  if (!Number.isSafeInteger(now) || now <= 0) return deny("invalid_clock");
  if (!actor || !caseRecord || !assignment || !request) return deny("missing_context");
  if (actor.tokenVerified !== true || actor.correctProject !== true ||
      actor.mfaVerified !== true || actor.staffIdentityVerified !== true ||
      actor.rosterStatus !== "approved") return deny("identity_not_approved");
  if (typeof actor.userId !== "string" || !actor.userId ||
      typeof caseRecord.id !== "string" || !caseRecord.id ||
      typeof request.caseId !== "string" || !request.caseId ||
      request.caseId !== caseRecord.id) return deny("case_mismatch");
  if (assignment.userId !== actor.userId ||
      assignment.caseId !== caseRecord.id ||
      assignment.revoked === true ||
      !Number.isSafeInteger(assignment.startsAt) ||
      !Number.isSafeInteger(assignment.expiresAt) ||
      assignment.startsAt > now || assignment.expiresAt <= now)
    return deny("assignment_inactive");
  if (typeof request.scope !== "string" || !request.scope ||
      assignment.scope !== request.scope) return deny("scope_mismatch");
  if (typeof actor.jurisdiction !== "string" || !actor.jurisdiction ||
      actor.jurisdiction !== caseRecord.jurisdiction) return deny("jurisdiction_mismatch");
  // Only this narrow, non-disclosing demonstration action can pass.
  // No read, edit, publish, dispatch or personal-data operation is implemented.
  if (request.action !== "check_assignment") return deny("action_not_supported");
  return Object.freeze({ allowed: true, reason: "assignment_valid_for_demo_only" });
}

// Synthetic regression cases, runnable with:
// node docs/tests/echoes-response-coordinator-decision.mjs
if (process.argv[1]?.endsWith("echoes-response-coordinator-decision.mjs")) {
  const assert = (condition, label) => {
    if (!condition) throw new Error("FAILED: " + label);
  };
  const baseline = {
    now: 1000,
    actor: { userId: "staff-a", tokenVerified: true, correctProject: true,
      mfaVerified: true, staffIdentityVerified: true, rosterStatus: "approved",
      jurisdiction: "pilot" },
    caseRecord: { id: "synthetic-case", jurisdiction: "pilot" },
    assignment: { userId: "staff-a", caseId: "synthetic-case",
      scope: "triage", startsAt: 900, expiresAt: 1100, revoked: false },
    request: { caseId: "synthetic-case", scope: "triage", action: "check_assignment" }
  };
  const check = (change, expected, label) => {
    const input = structuredClone(baseline);
    change(input);
    assert(assessCoordinatorAccess(input).allowed === expected, label);
  };
  check(() => {}, true, "synthetic valid assignment");
  check(x => { x.actor.tokenVerified = false; }, false, "invalid token");
  check(x => { x.actor.correctProject = false; }, false, "wrong project");
  check(x => { x.actor.mfaVerified = false; }, false, "missing MFA");
  check(x => { x.actor.rosterStatus = "suspended"; }, false, "suspended staff");
  check(x => { x.actor.userId = "staff-b"; }, false, "different staff");
  check(x => { x.request.caseId = "other-case"; }, false, "other case");
  check(x => { x.assignment.revoked = true; }, false, "revoked assignment");
  check(x => { x.assignment.expiresAt = 1000; }, false, "expired assignment");
  check(x => { x.assignment.startsAt = 1001; }, false, "future assignment");
  check(x => { x.request.scope = "safeguarding"; }, false, "scope mismatch");
  check(x => { x.actor.jurisdiction = "other"; }, false, "wrong jurisdiction");
  check(x => { x.request.action = "read_case"; }, false, "case read blocked");
  check(x => { x.request.action = "dispatch"; }, false, "dispatch blocked");
  check(x => { x.now = NaN; }, false, "invalid clock");
  console.log("PASS: 15 synthetic authorization checks");
}
