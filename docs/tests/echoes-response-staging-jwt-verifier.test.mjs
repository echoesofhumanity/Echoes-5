/**
 * Offline regression suite for the Echoes Response staging JWT prototype.
 * Run: node docs/tests/echoes-response-staging-jwt-verifier.test.mjs
 * Synthetic identities and ephemeral in-memory RSA keys only.
 * This does NOT verify live Supabase integration, MFA, or staff authorization.
 */
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyStagingJwt } from "./echoes-response-staging-jwt-verifier.mjs";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const { privateKey: foreignPrivateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const now = 1_800_000_000;
const trust = Object.freeze({
  issuer: "https://synthetic-staging.invalid/auth/v1",
  audience: "authenticated",
  keyId: "synthetic-key-1",
  publicKeyPem: publicKey.export({ type: "spki", format: "pem" })
});
const subject = "123e4567-e89b-42d3-a456-426614174000";
const header = { alg: "RS256", typ: "JWT", kid: trust.keyId };
const claims = {
  iss: trust.issuer, aud: trust.audience, sub: subject,
  iat: now - 60, exp: now + 600, aal: "aal2"
};
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (body = claims, head = header, key = privateKey) => {
  const signingInput = encode(head) + "." + encode(body);
  return signingInput + "." + sign("RSA-SHA256", Buffer.from(signingInput), key).toString("base64url");
};
let passed = 0;
const check = (name, token, expected, config = trust, at = now) => {
  const result = verifyStagingJwt(token, config, at);
  assert.equal(result.verified, expected, name + ": " + result.reason);
  passed++;
};
check("valid signed synthetic token", jwt(), true);
check("wrong issuer", jwt({ ...claims, iss: "https://other.invalid" }), false);
check("wrong audience", jwt({ ...claims, aud: "service_role" }), false);
check("expired", jwt({ ...claims, exp: now }), false);
check("not yet valid", jwt({ ...claims, nbf: now + 5 }), false);
check("insufficient assurance", jwt({ ...claims, aal: "aal1" }), false);
check("untrusted key id", jwt(claims, { ...header, kid: "unknown" }), false);
check("forged signing key", jwt(claims, header, foreignPrivateKey), false);
check("unsigned algorithm", jwt(claims, { ...header, alg: "none" }), false);
check("invalid subject", jwt({ ...claims, sub: "not-a-uuid" }), false);
check("malformed token", "not.a.jwt", false);
check("missing trust anchor", jwt(), false, { ...trust, publicKeyPem: "" });
check("tampered payload", jwt().replace(encode(claims), encode({ ...claims, aal: "aal1" })), false);
assert.equal(verifyStagingJwt(jwt(), trust, now).subject, subject);
console.log("PASS: " + passed + " offline synthetic JWT cases");
