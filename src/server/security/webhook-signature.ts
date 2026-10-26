import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verifies a Svix-style webhook signature (used by Resend). The signed content is
 * `<id>.<timestamp>.<body>`, signed with the base64 part of a `whsec_...` secret, and the
 * header holds one or more space-separated `v1,<base64 signature>` entries.
 */
export function verifySvixSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  now: Date;
}): boolean {
  const { secret, id, timestamp, signatureHeader, body, now } = input;
  if (!id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(now.getTime() / 1000 - sentAt) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signatureHeader.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const candidate = Buffer.from(signature, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

/** Constant-time check of an `Authorization: Bearer <secret>` header. */
export function verifyBearerSecret(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
