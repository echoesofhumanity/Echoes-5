/**
 * Echoes Response — OFFLINE coordinator lifecycle state machine.
 * Pure demonstration only: evidence is synthetic, NOT verified identity,
 * authorization, MFA, or an immutable audit. No DB, API, or real permissions.
 * All proposed changes must be executed atomically by a separately reviewed
 * trusted server with durable append-only audit before any deployment.
 */
const transitions = Object.freeze({
  pending: Object.freeze(["approved", "revoked"]),
  approved: Object.freeze(["suspended", "revoked"]),
  suspended: Object.freeze(["approved", "revoked"]),
  revoked: Object.freeze([])
});
const deny = reason => Object.freeze({ accepted: false, reason });

export function evaluateCoordinatorTransition(current, command) {
  if (!current || !command || typeof current !== "object" ||
      typeof command !== "object") return deny("invalid_input");
  if (!Object.hasOwn(transitions, current.status) ||
      !Object.hasOwn(transitions, command.to) ||
      !Number.isSafeInteger(current.version) || current.version < 0 ||
      !Number.isSafeInteger(command.expectedVersion) ||
      current.version !== command.expectedVersion) return deny("invalid_state_or_version");
  if (!transitions[current.status].includes(command.to))
    return deny("transition_forbidden");
  if (typeof current.userId !== "string" || !current.userId ||
      typeof command.actorId !== "string" || !command.actorId ||
      command.actorId === current.userId) return deny("self_or_missing_actor");
  if (command.actorVerified !== true || command.actorAuthorized !== true ||
      command.actorMfaVerified !== true || command.auditReady !== true ||
      typeof command.reasonCode !== "string" || !command.reasonCode)
    return deny("missing_verified_approval_or_audit");
  if (command.to === "approved") {
    if (command.identityVetted !== true || command.trainingVerified !== true ||
        command.jurisdictionVerified !== true) return deny("staff_not_vetted");
    if (command.safeguarding === true &&
        (typeof command.secondReviewerId !== "string" ||
         !command.secondReviewerId ||
         command.secondReviewerId === command.actorId ||
         command.secondReviewerId === current.userId ||
         command.secondReviewerVerified !== true ||
         command.secondReviewerAuthorized !== true ||
         command.secondReviewerMfaVerified !== true))
      return deny("second_independent_approval_required");
  }
  return Object.freeze({
    accepted: true,
    reason: "synthetic_transition_eligible_only",
    proposal: Object.freeze({
      userId: current.userId, from: current.status, to: command.to,
      expectedVersion: current.version, nextVersion: current.version + 1
    })
  });
}
