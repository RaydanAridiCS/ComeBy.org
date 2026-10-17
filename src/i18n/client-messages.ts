import "server-only";

import { getMessages } from "next-intl/server";
import type { Messages } from "./config";

/*
 * Client components only receive the message namespaces their part of the app
 * uses, instead of the whole catalogue on every page. That keeps the public
 * invite page light on slow phones. Nested NextIntlClientProviders replace (not
 * merge) their parent's messages, so each set lists everything its subtree needs.
 */

type Namespace = keyof Messages;

/** Every page (the root error boundary and form error translation). */
export const ROOT_NAMESPACES: Namespace[] = ["common", "errors"];
/** The public invite page: RSVP form, countdown, calendar menu, report dialog. */
export const INVITE_NAMESPACES: Namespace[] = [
  "common",
  "errors",
  "eventPage",
  "rsvp",
  "report",
  "status",
];
/** The landing page: hero phone and theme showcase. */
export const LANDING_NAMESPACES: Namespace[] = [
  "common",
  "errors",
  "landing",
  "themes",
  "eventPage",
  "rsvp",
];
/** Sign in, sign up and password reset. */
export const AUTH_NAMESPACES: Namespace[] = ["common", "errors", "auth", "nav"];
/** The host dashboard, event form and settings. */
export const DASHBOARD_NAMESPACES: Namespace[] = [
  "common",
  "errors",
  "nav",
  "dashboard",
  "eventForm",
  "eventDashboard",
  "eventPage",
  "rsvp",
  "report",
  "status",
  "changes",
  "settings",
  "push",
  "themes",
];

export async function clientMessages(namespaces: Namespace[]): Promise<Partial<Messages>> {
  const messages = (await getMessages()) as Messages;
  return Object.fromEntries(namespaces.map((namespace) => [namespace, messages[namespace]]));
}
