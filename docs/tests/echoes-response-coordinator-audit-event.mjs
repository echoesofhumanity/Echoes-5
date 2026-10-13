/**
 * Echoes Response — synthetic coordinator audit-event validation.
 * OFFLINE REVIEW REFERENCE ONLY. Structural checks do not prove provenance,
 * authorization, cryptographic integrity, append-only storage or atomic commit.
 * No database, network, user accounts, or operational permissions.
 */
const states = new Set(["pending", "approved", "suspended", "revoked"]);
// Strict allowlist: unknown fields, including unexpected sensitive data, fail closed.
const requiredKeys = new Set([
  "eventId", "transitionId", "targetStaffId", "actorId", "requestId",
  "reasonCode", "policyVersion", "timestampSeconds", "fromStatus",
  "toStatus", "previousVersion", "nextVersion", "highRiskApproval",
  "decisionIds"
]);
const optionalKeys = new Set(["secondReviewerId"]);
const id = x => typeof x === "string" && /^[a-zA-Z0-9_-]{3,96}$/.test(x);
const deny = reason => Object.freeze({ valid: false, reason });

export function validateSyntheticCoordinatorAuditEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event))
    return deny("invalid_event");
  if (Object.keys(event).some(k => !requiredKeys.has(k) && !optionalKeys.has(k)))
    return deny("unexpected_field");
  if ([...requiredKeys].some(k => !Object.hasOwn(event, k)))
    return deny("missing_required_field");
  if (typeof event.highRiskApproval !== "boolean")
    return deny("invalid_risk_flag");
  const keys = ["eventId", "transitionId", "targetStaffId", "actorId",
    "requestId", "reasonCode", "policyVersion"];
  if (keys.some(k => !id(event[k])) ||
      !Number.isSafeInteger(event.timestampSeconds) ||
      event.timestampSeconds <= 0)
    return deny("missing_or_invalid_metadata");
  if (!states.has(event.fromStatus) || !states.has(event.toStatus) ||
      event.fromStatus === event.toStatus ||
      !Number.isSafeInteger(event.previousVersion) ||
      event.previousVersion < 0 ||
      !Number.isSafeInteger(event.nextVersion) ||
      event.nextVersion !== event.previousVersion + 1)
    return deny("invalid_transition_metadata");
  if (event.actorId === event.targetStaffId)
    return deny("self_approval");
  if (!Array.isArray(event.decisionIds) ||
      event.decisionIds.length < 1 ||
      event.decisionIds.some(x => !id(x)) ||
      new Set(event.decisionIds).size !== event.decisionIds.length)
    return deny("invalid_decision_references");
  if (event.highRiskApproval === true && event.toStatus === "approved" &&
      (!id(event.secondReviewerId) ||
       event.secondReviewerId === event.actorId ||
       event.secondReviewerId === event.targetStaffId ||
       event.decisionIds.length < 2))
    return deny("missing_independent_review");
  if (event.secondReviewerId !== undefined &&
      (!id(event.secondReviewerId) ||
       event.secondReviewerId === event.actorId ||
       event.secondReviewerId === event.targetStaffId))
    return deny("invalid_second_reviewer");
  // Event references must be checked against authoritative reviewer records
  // and durable storage in a future reviewed server transaction.
  return Object.freeze({ valid: true, reason: "synthetic_structure_only" });
}
