import { logger } from "@/lib/logger";
import type { SuppressionReason } from "../repositories/types";
import type { ServiceDeps } from "./deps";

/**
 * Who an unsubscribe link is for:
 * - `guest`: a guest's address, for event update emails. Adds it to the suppression list.
 * - `host`: a host's address, for response alerts and summaries. Turns their email alerts off.
 */
export type UnsubscribeScope = "guest" | "host";

/**
 * What kind of email this is, which decides who may stop it:
 * - `transactional`: the person asked for it (confirm email, reset password, RSVP receipt).
 *   An unsubscribe doesn't stop these, but a bounce or complaint does.
 * - `guest-update`: event changed or cancelled, sent to guests who left an email.
 * - `host-alert`: response alerts and daily summaries for hosts.
 */
export type EmailCategory = "transactional" | "guest-update" | "host-alert";

/** Whether an address with `reason` may receive a `category` email. Pure, so it's easy to test. */
export function isSendAllowed(reason: SuppressionReason | null, category: EmailCategory): boolean {
  if (!reason) return true;
  if (reason === "unsubscribed") return category === "transactional";
  return false; // bounced or complained: never email this address again
}

export function createSuppressionService(deps: ServiceDeps) {
  const { repos } = deps;

  return {
    async canSend(email: string, category: EmailCategory): Promise<boolean> {
      return isSendAllowed(
        await repos.emailSuppressions.find(email.trim().toLowerCase()),
        category,
      );
    },

    async suppress(email: string, reason: SuppressionReason): Promise<void> {
      await repos.emailSuppressions.add(email.trim().toLowerCase(), reason);
      logger.info({ reason }, "Email address suppressed");
    },

    /** Applies a confirmed unsubscribe. Hosts turn their alerts off; guests are suppressed. */
    async unsubscribe(scope: UnsubscribeScope, rawEmail: string): Promise<void> {
      const email = rawEmail.trim().toLowerCase();
      if (scope === "guest") {
        await repos.emailSuppressions.add(email, "unsubscribed");
        return;
      }
      const host = await repos.users.findByEmail(email);
      if (host) await repos.userSettings.upsert(host.id, { emailAlerts: "off" });
    },
  };
}
