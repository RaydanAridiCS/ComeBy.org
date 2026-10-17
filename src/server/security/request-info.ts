import "server-only";

import { headers } from "next/headers";
import { hmac } from "./crypto";

/**
 * Best-effort client IP. Behind Cloudflare we trust `cf-connecting-ip`; behind a
 * normal reverse proxy (Coolify/Traefik) the first `x-forwarded-for` entry.
 */
export function clientIpFrom(requestHeaders: Headers): string {
  const cloudflare = requestHeaders.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

/** A salted hash of the caller's network. Safe to store; can't be reversed to an IP. */
export async function networkFingerprint(): Promise<string> {
  return hmac(`net:${clientIpFrom(await headers())}`);
}
