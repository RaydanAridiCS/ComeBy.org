import { logger } from "@/lib/logger";
import { AppError } from "../errors";
import type { EventRecord } from "../repositories/types";
import type { ServiceDeps } from "./deps";

const QUEUE_LIMIT = 100;
const AUDIT_LIMIT = 30;

/** The admin performing an action, recorded in the audit log. */
export type AdminActor = { id: string; email: string };

/** Moderation actions for operators. Callers must have checked `isAdmin` first. */
export function createAdminService(deps: ServiceDeps) {
  const { repos, transaction } = deps;

  async function getEvent(eventId: string): Promise<EventRecord> {
    const event = await repos.events.findById(eventId);
    if (!event) throw new AppError("not_found");
    return event;
  }

  return {
    queue() {
      return repos.admin.listModerationQueue(QUEUE_LIMIT);
    },

    recentActions() {
      return repos.admin.listAudit(AUDIT_LIMIT);
    },

    /** Clears the reports and shows the event again (e.g. it was reported by mistake or abuse). */
    async restore(actor: AdminActor, eventId: string): Promise<EventRecord> {
      const event = await getEvent(eventId);
      await transaction(async (tx) => {
        await tx.admin.restoreEvent(event.id);
        await tx.admin.addAudit({
          adminId: actor.id,
          adminEmail: actor.email,
          action: "restore_event",
          eventId: event.id,
          eventTitle: event.title,
          eventSlug: event.slug,
        });
      });
      logger.info({ eventId: event.id, adminId: actor.id }, "Admin restored event");
      return event;
    },

    /** Deletes an event for good. Returns its cover key so the caller can remove the file. */
    async remove(
      actor: AdminActor,
      eventId: string,
    ): Promise<{ slug: string; coverImageKey: string | null }> {
      const event = await getEvent(eventId);
      await transaction(async (tx) => {
        await tx.admin.addAudit({
          adminId: actor.id,
          adminEmail: actor.email,
          action: "delete_event",
          eventId: event.id,
          eventTitle: event.title,
          eventSlug: event.slug,
        });
        await tx.events.delete(event.id);
      });
      logger.info({ eventId: event.id, adminId: actor.id }, "Admin deleted event");
      return { slug: event.slug, coverImageKey: event.coverImageKey };
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
