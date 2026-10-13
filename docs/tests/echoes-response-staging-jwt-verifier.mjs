/**
 * Echoes Response — offline JWT signature/claim verifier prototype.
 * Node.js >=20; local-only, no API endpoint, no network, no secrets.
 * Trust anchor MUST be a separately configured, trusted staging public key.
 * Not a complete Supabase Auth or MFA integration. Never deploy as-is.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";

const fail = (reason) => Object.freeze({ verified: false, reason });
const decode = (part) => {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("bad_base64url");
  return Buffer.from(part, "base64url");
};
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

export function verifyStagingJwt(token, trust, nowSeconds) {
  try {
    if (typeof token !== "string" || token.length > 8192 ||
        !object(trust) || !Number.isSafeInteger(nowSeconds) || nowSeconds <= 0)
      return fail("invalid_input");
    if (typeof trust.issuer !== "string" || !trust.issuer ||
        typeof trust.audience !== "string" || !trust.audience ||
        typeof trust.publicKeyPem !== "string" || !trust.publicKeyPem)
      return fail("missing_trust_anchor");
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some(x => !x)) return fail("invalid_token");
    const header = JSON.parse(decode(parts[0]).toString("utf8"));
    const claims = JSON.parse(decode(parts[1]).toString("utf8"));
    if (!object(header) || !object(claims) ||
        header.alg !== "RS256" || header.typ !== "JWT" ||
        typeof header.kid !== "string" || !header.kid ||
        header.kid !== trust.keyId) return fail("untrusted_header");
    const key = createPublicKey(trust.publicKeyPem);
    if (key.asymmetricKeyType !== "rsa") return fail("invalid_key");
    const signed = Buffer.from(parts[0] + "." + parts[1], "ascii");
    if (!verifySignature("RSA-SHA256", signed, key, decode(parts[2])))
      return fail("invalid_signature");
    if (claims.iss !== trust.issuer ||
        !(claims.aud === trust.audience ||
          (Array.isArray(claims.aud) && claims.aud.includes(trust.audience))) ||
        typeof claims.sub !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub) ||
        !Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds ||
        !Number.isSafeInteger(claims.iat) || claims.iat > nowSeconds ||
        (claims.nbf !== undefined &&
          (!Number.isSafeInteger(claims.nbf) || claims.nbf > nowSeconds)))
      return fail("invalid_claims");
    // AAL2 is only a JWT claim. Server must independently verify current
    // MFA enrollment/session assurance and staff approval at request time.
    if (claims.aal !== "aal2") return fail("insufficient_assurance");
    return Object.freeze({ verified: true, subject: claims.sub, reason: "signature_and_claims_only" });
  } catch {
    return fail("verification_error");
  }
}
