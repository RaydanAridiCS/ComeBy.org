import "server-only";

import { absoluteUrl } from "@/lib/share";
import type { UnsubscribeScope } from "../services/suppression.service";
import { hmac, safeEqualHex } from "./crypto";

export type { UnsubscribeScope };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const sign = (scope: UnsubscribeScope, email: string) => hmac(`unsubscribe:${scope}:${email}`);

/** Signed, stateless token: it can only be made by us, so nobody can unsubscribe someone else. */
export function createUnsubscribeToken(scope: UnsubscribeScope, rawEmail: string): string {
  const email = normalizeEmail(rawEmail);
  return `${scope}.${Buffer.from(email).toString("base64url")}.${sign(scope, email)}`;
}

export function verifyUnsubscribeToken(
  token: string | null | undefined,
): { scope: UnsubscribeScope; email: string } | null {
  if (!token || token.length > 600) return null;
  const [scope, encoded, signature, ...rest] = token.split(".");
  if (rest.length > 0 || !encoded || !signature) return null;
  if (scope !== "guest" && scope !== "host") return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8");
  if (!/^[0-9a-f]{64}$/.test(signature)) return null;
  return safeEqualHex(signature, sign(scope, email)) ? { scope, email } : null;
}

/** The page a person lands on from the link in the email body (asks for confirmation). */
export function unsubscribePageUrl(scope: UnsubscribeScope, email: string): string {
  return absoluteUrl(`/unsubscribe?t=${createUnsubscribeToken(scope, email)}`);
}

/** The one-click endpoint mail clients call for the `List-Unsubscribe` header (RFC 8058). */
export function unsubscribeOneClickUrl(scope: UnsubscribeScope, email: string): string {
  return absoluteUrl(`/api/unsubscribe?t=${createUnsubscribeToken(scope, email)}`);
}
