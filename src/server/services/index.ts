import "server-only";

import { jobQueue } from "../jobs/queue";
import { repositories, runInTransaction } from "../repositories";
import { createAdminService } from "./admin.service";
import type { ServiceDeps } from "./deps";
import { createEventService } from "./event.service";
import { createNotificationService } from "./notification.service";
import { createReportService } from "./report.service";
import { createRsvpService } from "./rsvp.service";
import { createSuppressionService } from "./suppression.service";

/** Production wiring: real repositories, real job queue, real clock. */
const deps: ServiceDeps = {
  repos: repositories,
  transaction: runInTransaction,
  jobs: jobQueue,
  now: () => new Date(),
};

export const adminService = createAdminService(deps);
export const eventService = createEventService(deps);
export const rsvpService = createRsvpService(deps);
export const notificationService = createNotificationService(deps);
export const reportService = createReportService(deps);
export const suppressionService = createSuppressionService(deps);
export { repositories };
