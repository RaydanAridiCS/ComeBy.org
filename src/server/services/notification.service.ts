import "server-only";

import { LIMITS } from "@/config/limits";
import {
  eventCancelled,
  eventHiddenAlert,
  eventUpdated,
  guestNudge,
  guestReminder,
  hostDigest,
  hostRsvpAlert,
} from "@/emails/templates";
import { getServerTranslator } from "@/i18n/config";
import { formatEventWhen } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { absoluteUrl, eventUrl } from "@/lib/share";
import { sendPush } from "../adapters/push";
import { adminEmails } from "../auth/admin-policy";
import type { JobPayloads } from "../jobs/types";
import type { EventRecord } from "../repositories/types";
import { DAY_MS, HOUR_MS, type ServiceDeps } from "./deps";
import { queueEmail, unsubscribeLinks } from "./email.service";
import { collectNudgeRecipients } from "./nudge-recipients";

/** Events checked per reminder sweep. The sweep runs every few minutes, so a backlog drains fast. */
const REMINDER_EVENTS_PER_SWEEP = 200;

const ALERT_EMAIL_KEY = (hostId: string) => `alert-email:${hostId}`;

function locationLabel(event: EventRecord): string | null {
  const t = getServerTranslator();
  if (event.locationType === "online") return t("eventPage.online");
  if (event.locationType === "tbd") return t("eventPage.locationTbd");
  return [event.locationName, event.locationAddress].filter(Boolean).join(", ") || null;
}

function statusLabel(status: string): string {
  const t = getServerTranslator();
  if (status === "going" || status === "maybe" || status === "not_going") {
    return t(`status.${status}`);
  }
  return status;
}

/** Background-job handlers that notify hosts and guests. */
export function createNotificationService(deps: ServiceDeps) {
  const { repos, jobs, now } = deps;

  return {
    /** A guest responded: push the host and email them (respecting their settings and quota). */
    async handleRsvpAlert(payload: JobPayloads["host.rsvp-alert"]): Promise<void> {
      const event = await repos.events.findById(payload.eventId);
      const rsvp = await repos.rsvps.findById(payload.rsvpId);
      if (!event || !rsvp) return;
      const [host, settings, stats] = await Promise.all([
        repos.users.findById(event.hostId),
        repos.userSettings.get(event.hostId),
        repos.rsvps.statsByEvent(event.id),
      ]);
      if (!host) return;
      const t = getServerTranslator();
      const status = statusLabel(rsvp.status);
      const dashboardPath = `/dashboard/events/${event.id}`;

      if (settings.pushAlerts) {
        const subscriptions = await repos.pushSubscriptions.listByUser(host.id);
        const title =
          payload.kind === "updated"
            ? t("push.changedRsvpTitle", { name: rsvp.name, status })
            : t("push.newRsvpTitle", { name: rsvp.name, status });
        const body = t("push.newRsvpBody", { event: event.title, going: stats.guests });
        await Promise.all(
          subscriptions.map(async (subscription) => {
            const result = await sendPush(subscription, {
              title,
              body,
              url: dashboardPath,
              tag: `event-${event.id}`,
            });
            if (result === "gone")
              await repos.pushSubscriptions.deleteByEndpoint(subscription.endpoint);
          }),
        );
      }

      if (settings.emailAlerts !== "instant") return;
      const sentToday = await repos.rateLimits.hit(ALERT_EMAIL_KEY(host.id), DAY_MS, now());
      if (sentToday > LIMITS.instantAlertEmailsPerHostPerDay) return; // the daily digest covers the rest

      const links = unsubscribeLinks("host", host.email);
      await queueEmail(
        jobs,
        host.email,
        hostRsvpAlert({
          unsubscribeUrl: links.page,
          guestName: rsvp.name,
          eventTitle: event.title,
          status,
          ...(payload.from ? { from: statusLabel(payload.from) } : {}),
          message: rsvp.message,
          totals: { going: stats.going, maybe: stats.maybe, notGoing: stats.notGoing },
          dashboardUrl: absoluteUrl(dashboardPath),
        }),
        { category: "host-alert", oneClickUnsubscribeUrl: links.oneClick },
      );
    },

    /** Daily summary for hosts on "daily" mode and hosts who used up today's instant emails. */
    async handleDailyDigest(): Promise<void> {
      const at = now();
      const since = new Date(at.getTime() - DAY_MS);
      const hostIds = await repos.users.listIdsWithRsvpActivitySince(since);
      for (const hostId of hostIds) {
        const settings = await repos.userSettings.get(hostId);
        if (settings.emailAlerts === "off") continue;
        if (settings.emailAlerts === "instant") {
          const sent = await repos.rateLimits.peek(ALERT_EMAIL_KEY(hostId), DAY_MS, at);
          if (sent <= LIMITS.instantAlertEmailsPerHostPerDay) continue;
        }
        const host = await repos.users.findById(hostId);
        if (!host) continue;
        const activity = await repos.activity.listRsvpActivityForHostSince(hostId, since);
        if (activity.length === 0) continue;
        const perEvent = new Map<string, number>();
        for (const item of activity) {
          perEvent.set(item.eventTitle, (perEvent.get(item.eventTitle) ?? 0) + 1);
        }
        const links = unsubscribeLinks("host", host.email);
        await queueEmail(
          jobs,
          host.email,
          hostDigest({
            unsubscribeUrl: links.page,
            total: activity.length,
            events: [...perEvent].map(([title, count]) => ({ title, count })),
            dashboardUrl: absoluteUrl("/dashboard"),
          }),
          { category: "host-alert", oneClickUnsubscribeUrl: links.oneClick },
        );
      }
    },

    /** Emails every opted-in guest that the event changed or was cancelled. */
    async handleEventUpdate(payload: JobPayloads["guests.event-update"]): Promise<void> {
      const event = await repos.events.findById(payload.eventId);
      if (!event) return;
      const recipients = await repos.rsvps.listEmailRecipients(event.id);
      const t = getServerTranslator();
      const changes = payload.changes
        .map((change) =>
          change === "time" || change === "location" || change === "title" || change === "details"
            ? t(`changes.${change}`)
            : change,
        )
        .join(", ");
      const url = eventUrl(event.slug);
      for (const recipient of recipients) {
        if (!recipient.email) continue;
        const links = unsubscribeLinks("guest", recipient.email);
        const email =
          payload.kind === "cancelled"
            ? eventCancelled({
                unsubscribeUrl: links.page,
                guestName: recipient.name,
                eventTitle: event.title,
                message: event.cancelMessage,
                eventUrl: url,
              })
            : eventUpdated({
                unsubscribeUrl: links.page,
                guestName: recipient.name,
                eventTitle: event.title,
                changes,
                when: formatEventWhen(event.startsAt, event.endsAt, event.timezone),
                where: locationLabel(event),
                eventUrl: url,
              });
        await queueEmail(jobs, recipient.email, email, {
          category: "guest-update",
          oneClickUnsubscribeUrl: links.oneClick,
        });
      }
    },

    /**
     * Sweep that sends the one reminder each going/maybe guest gets. It reads the event time
     * live, so editing the time moves the reminder and cancelling or hiding stops it. Each guest
     * is claimed (marked reminded) before the email is queued, so overlapping sweeps never
     * double-send.
     */
    async handleRemindersDue(): Promise<void> {
      const at = now();
      const windowEnd = new Date(at.getTime() + LIMITS.reminderHoursBefore * HOUR_MS);
      const respondedBefore = new Date(at.getTime() - LIMITS.reminderMinGuestAgeHours * HOUR_MS);
      const due = await repos.events.listDueForReminder(
        at,
        windowEnd,
        respondedBefore,
        REMINDER_EVENTS_PER_SWEEP,
      );
      let reminded = 0;
      for (const event of due) {
        const recipients = await repos.rsvps.claimReminderRecipients(event.id, at, respondedBefore);
        const when = formatEventWhen(event.startsAt, event.endsAt, event.timezone);
        const where = locationLabel(event);
        const url = eventUrl(event.slug);
        for (const recipient of recipients) {
          if (!recipient.email) continue;
          const links = unsubscribeLinks("guest", recipient.email);
          await queueEmail(
            jobs,
            recipient.email,
            guestReminder({
              unsubscribeUrl: links.page,
              guestName: recipient.name,
              eventTitle: event.title,
              when,
              where,
              eventUrl: url,
            }),
            { category: "guest-update", oneClickUnsubscribeUrl: links.oneClick },
          );
          reminded += 1;
        }
      }
      if (reminded > 0) logger.info({ reminded, events: due.length }, "Queued guest reminders");
    },

    /** The host's one-time nudge to "maybe" guests and pasted invitees who haven't answered. */
    async handleNudge(payload: JobPayloads["guests.nudge"]): Promise<void> {
      const event = await repos.events.findById(payload.eventId);
      if (!event || event.status !== "active" || event.hiddenAt || event.guestDataPurgedAt) return;
      const recipients = await collectNudgeRecipients(repos, event.id);
      const when = formatEventWhen(event.startsAt, event.endsAt, event.timezone);
      const where = locationLabel(event);
      const url = eventUrl(event.slug);
      for (const recipient of recipients) {
        const links = unsubscribeLinks("guest", recipient.email);
        await queueEmail(
          jobs,
          recipient.email,
          guestNudge({
            unsubscribeUrl: links.page,
            eventTitle: event.title,
            hostName: event.hostName,
            when,
            where,
            eventUrl: url,
          }),
          { category: "guest-update", oneClickUnsubscribeUrl: links.oneClick },
        );
      }
      await repos.activity.add({
        eventId: event.id,
        type: "nudge_sent",
        data: { recipients: recipients.length },
      });
    },

    /** Tells every operator that an event was hidden automatically and needs review. */
    async handleEventHidden(payload: JobPayloads["moderation.event-hidden"]): Promise<void> {
      const event = await repos.events.findById(payload.eventId);
      if (!event?.hiddenAt) return;
      for (const email of adminEmails()) {
        await queueEmail(
          jobs,
          email,
          eventHiddenAlert({
            eventTitle: event.title,
            reportCount: event.reportCount,
            adminUrl: absoluteUrl("/admin"),
          }),
        );
      }
    },

    /** Deletes guests' phone numbers and emails once events are long over. */
    async handleGuestDataPurge(): Promise<void> {
      const cutoff = new Date(now().getTime() - LIMITS.guestDataRetentionDays * DAY_MS);
      for (;;) {
        const due = await repos.events.listDueForGuestDataPurge(cutoff, 100);
        if (due.length === 0) break;
        for (const { id } of due) {
          await repos.rsvps.purgeContactDetails(id);
          await repos.invitees.deleteByEvent(id);
          await repos.events.update(id, { guestDataPurgedAt: now() });
        }
        logger.info({ events: due.length }, "Purged guest contact details");
      }
    },

    async handleRateLimitCleanup(): Promise<void> {
      const removed = await repos.rateLimits.deleteExpired(now());
      if (removed > 0) logger.debug({ removed }, "Removed expired rate-limit counters");
    },
  };
}

export { locationLabel, statusLabel };
