import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Keyed hash for values we must compare but never store in the clear, such as
 * IP addresses used for rate limits and abuse reports.
 */
export function hmac(value: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("hex");
}

/** URL-safe random secret, e.g. for guests' edit links. */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
