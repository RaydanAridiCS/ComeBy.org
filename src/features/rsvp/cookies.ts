import "server-only";

import { cookies } from "next/headers";
import { env } from "@/env";
import { randomToken } from "@/server/security/crypto";
import {
  formatCredential,
  parseCredential,
  type RsvpCredential,
} from "@/server/services/rsvp.service";

/*
 * Guests have no accounts. Their browser remembers their own response with an
 * httpOnly cookie per event holding the private edit credential.
 */

const ONE_YEAR = 60 * 60 * 24 * 365;
const secure = env.NEXT_PUBLIC_APP_URL.startsWith("https://");

const rsvpCookieName = (eventId: string) => `cb_rsvp_${eventId.replaceAll("-", "")}`;
const DEVICE_COOKIE = "cb_device";

export async function readRsvpCredential(eventId: string): Promise<RsvpCredential | null> {
  const store = await cookies();
  return parseCredential(store.get(rsvpCookieName(eventId))?.value);
}

export async function writeRsvpCredential(
  eventId: string,
  credential: RsvpCredential,
): Promise<void> {
  const store = await cookies();
  store.set(rsvpCookieName(eventId), formatCredential(credential), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** A random ID for this browser, used only for rate limiting responses. */
export async function deviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing && /^[\w-]{16,64}$/.test(existing)) return existing;
  const fresh = randomToken(16);
  store.set(DEVICE_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ONE_YEAR,
  });
  return fresh;
}
