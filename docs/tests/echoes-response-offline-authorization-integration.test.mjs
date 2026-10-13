/**
 * Echoes Response — offline integration test only.
 * JWT verification is real cryptographic verification with synthetic keys.
 * Roster/assignment evidence is a trusted-server MOCK, NOT database proof.
 * No external requests, secrets, live access or operational case permissions.
 */
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyStagingJwt } from "./echoes-response-staging-jwt-verifier.mjs";
import { assessCoordinatorAccess } from "./echoes-response-coordinator-decision.mjs";

const now = 1_800_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const trust = {
  issuer: "https://synthetic-staging.invalid/auth/v1",
  audience: "authenticated",
  keyId: "test-key",
  publicKeyPem: publicKey.export({ type: "spki", format: "pem" })
};
const subject = "123e4567-e89b-42d3-a456-426614174000";
const encode = x => Buffer.from(JSON.stringify(x)).toString("base64url");
const token = (overrides = {}) => {
  const h = encode({ alg: "RS256", typ: "JWT", kid: "test-key" });
  const p = encode({
    iss: trust.issuer, aud: trust.audience, sub: subject,
    iat: now - 60, exp: now + 600, aal: "aal2", ...overrides
  });
  const data = h + "." + p;
  return data + "." + sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url");
};
const base = () => ({
  now,
  caseRecord: { id: "synthetic-case", jurisdiction: "pilot" },
  assignment: { userId: subject, caseId: "synthetic-case",
    scope: "triage", startsAt: now - 100, expiresAt: now + 100, revoked: false },
  request: { caseId: "synthetic-case", scope: "triage", action: "check_assignment" }
});
function decide(signedToken, mockRoster, modify = () => {}) {
  const verification = verifyStagingJwt(signedToken, trust, now);
  if (!verification.verified) return { allowed: false, reason: verification.reason };
  // In production, the following evidence MUST be loaded and verified by a
  // trusted server at request time, not supplied by a client.
  if (!mockRoster || mockRoster.userId !== verification.subject ||
      mockRoster.staffIdentityVerified !== true ||
      mockRoster.mfaIndependentlyVerified !== true)
    return { allowed: false, reason: "untrusted_roster" };
  const input = base();
  input.actor = {
    userId: verification.subject, tokenVerified: true, correctProject: true,
    mfaVerified: true, staffIdentityVerified: true,
    rosterStatus: mockRoster.status, jurisdiction: mockRoster.jurisdiction
  };
  modify(input);
  return assessCoordinatorAccess(input);
}
const roster = {
  userId: subject, status: "approved", jurisdiction: "pilot",
  staffIdentityVerified: true, mfaIndependentlyVerified: true
};
let passed = 0;
function check(name, signedToken, staff, modify, expected) {
  const result = decide(signedToken, staff, modify);
  assert.equal(result.allowed, expected, name + ": " + result.reason);
  passed++;
}
check("synthetic approved staff assignment", token(), roster, () => {}, true);
check("wrong issuer", token({ iss: "https://other.invalid" }), roster, () => {}, false);
check("expired token", token({ exp: now }), roster, () => {}, false);
check("insufficient JWT assurance", token({ aal: "aal1" }), roster, () => {}, false);
check("no roster", token(), null, () => {}, false);
check("roster belongs to another user", token(), { ...roster, userId: "other" }, () => {}, false);
check("unverified staff identity", token(), { ...roster, staffIdentityVerified: false }, () => {}, false);
check("independent MFA absent", token(), { ...roster, mfaIndependentlyVerified: false }, () => {}, false);
check("suspended staff", token(), { ...roster, status: "suspended" }, () => {}, false);
check("expired assignment", token(), roster, x => { x.assignment.expiresAt = now; }, false);
check("another case", token(), roster, x => { x.request.caseId = "other"; }, false);
check("wrong scope", token(), roster, x => { x.request.scope = "auditor"; }, false);
check("unauthorized case read", token(), roster, x => { x.request.action = "read_case"; }, false);
console.log("PASS: " + passed + " offline synthetic integration checks");
