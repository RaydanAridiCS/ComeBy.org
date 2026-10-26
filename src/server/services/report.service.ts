import { LIMITS } from "@/config/limits";
import { logger } from "@/lib/logger";
import { AppError } from "../errors";
import { DAY_MS, type ServiceDeps } from "./deps";

const REPORTS_PER_NETWORK_PER_DAY = 10;

export function createReportService(deps: ServiceDeps) {
  const { repos, jobs, now } = deps;

  return {
    /**
     * Records a report. One report per network per event; after enough reports the
     * event is hidden automatically until someone reviews it.
     */
    async report(input: {
      eventId: string;
      reason: "spam" | "scam" | "inappropriate" | "other";
      details: string;
      reporterHash: string;
    }): Promise<void> {
      const hits = await repos.rateLimits.hit(`report:${input.reporterHash}`, DAY_MS, now());
      if (hits > REPORTS_PER_NETWORK_PER_DAY) throw new AppError("rate_limited");

      const event = await repos.events.findById(input.eventId);
      if (!event) throw new AppError("not_found");

      const isNew = await repos.reports.create({
        eventId: event.id,
        reason: input.reason,
        details: input.details || null,
        reporterHash: input.reporterHash,
      });
      if (!isNew) return;

      const total = await repos.events.incrementReportCount(event.id);
      logger.warn({ eventId: event.id, reason: input.reason, total }, "Event reported");
      if (total >= LIMITS.reportsBeforeAutoHide && !event.hiddenAt) {
        await repos.events.update(event.id, { hiddenAt: now() });
        logger.warn({ eventId: event.id }, "Event auto-hidden after reports; needs review");
        await jobs.enqueue("moderation.event-hidden", { eventId: event.id });
      }
    },
  };
}
