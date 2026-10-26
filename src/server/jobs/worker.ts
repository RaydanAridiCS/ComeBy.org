import "server-only";

import { env } from "@/env";
import { logger } from "@/lib/logger";
import { getEmailSender } from "../adapters/email";
import { reportError } from "../monitoring/error-reporting";
import { notificationService, suppressionService } from "../services";
import { getBoss, setInlineJobHandler } from "./queue";
import type { JobName, JobPayloads } from "./types";

/** Runs one job. Shared by the pg-boss workers and the inline (jobs disabled) mode. */
async function runJob<K extends JobName>(name: K, data: JobPayloads[K]): Promise<void> {
  switch (name) {
    case "email.send": {
      const message = data as JobPayloads["email.send"];
      if (!(await suppressionService.canSend(message.to, message.category ?? "transactional"))) {
        logger.info({ category: message.category }, "Email skipped: address is suppressed");
        return;
      }
      const sender = await getEmailSender();
      await sender.send({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.headers ? { headers: message.headers } : {}),
      });
      return;
    }
    case "host.rsvp-alert":
      return notificationService.handleRsvpAlert(data as JobPayloads["host.rsvp-alert"]);
    case "guests.event-update":
      return notificationService.handleEventUpdate(data as JobPayloads["guests.event-update"]);
    case "guests.reminders-due":
      return notificationService.handleRemindersDue();
    case "guests.nudge":
      return notificationService.handleNudge(data as JobPayloads["guests.nudge"]);
    case "hosts.daily-digest":
      return notificationService.handleDailyDigest();
    case "privacy.purge-guest-data":
      return notificationService.handleGuestDataPurge();
    case "moderation.event-hidden":
      return notificationService.handleEventHidden(data as JobPayloads["moderation.event-hidden"]);
    case "maintenance.cleanup-rate-limits":
      return notificationService.handleRateLimitCleanup();
  }
}

/** Recurring jobs (cron syntax, UTC). */
const SCHEDULES: { name: JobName; cron: string }[] = [
  { name: "guests.reminders-due", cron: "*/15 * * * *" },
  { name: "hosts.daily-digest", cron: "0 18 * * *" },
  { name: "privacy.purge-guest-data", cron: "30 3 * * *" },
  { name: "maintenance.cleanup-rate-limits", cron: "15 * * * *" },
];

const WORKER_NAMES: JobName[] = [
  "email.send",
  "host.rsvp-alert",
  "guests.event-update",
  "guests.reminders-due",
  "guests.nudge",
  "hosts.daily-digest",
  "privacy.purge-guest-data",
  "moderation.event-hidden",
  "maintenance.cleanup-rate-limits",
];

/**
 * Starts the background workers inside the web server process. Called once from
 * `instrumentation.ts`. One process is plenty for Comeby's single-server setup.
 */
export async function startWorkers(): Promise<void> {
  setInlineJobHandler(runJob);
  if (!env.JOBS_ENABLED) {
    logger.warn("Background jobs disabled (JOBS_ENABLED=false); jobs run inline");
    return;
  }
  const boss = await getBoss();
  for (const name of WORKER_NAMES) {
    await boss.work<JobPayloads[typeof name]>(name, async (jobs) => {
      for (const job of jobs) {
        try {
          await runJob(name, job.data);
        } catch (error) {
          logger.error({ err: error, job: name, jobId: job.id }, "Job failed");
          await reportError(error, { source: "job", job: name });
          throw error;
        }
      }
    });
  }
  for (const schedule of SCHEDULES) {
    await boss.schedule(schedule.name, schedule.cron, {}, { tz: "UTC" });
  }
  logger.info({ workers: WORKER_NAMES.length }, "Background workers started");
}
