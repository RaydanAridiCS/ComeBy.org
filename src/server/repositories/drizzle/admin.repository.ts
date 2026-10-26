import { desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import { adminAuditLog, events, reports, user } from "@/db/schema";
import type { AdminRepository } from "../interfaces";
import type { ModerationItem, ReportReason } from "../types";

const DETAILS_PER_EVENT = 3;

export function createAdminRepository(db: DatabaseOrTransaction): AdminRepository {
  return {
    async listModerationQueue(limit) {
      const rows = await db
        .select({
          id: events.id,
          slug: events.slug,
          title: events.title,
          status: events.status,
          hostName: user.name,
          hostEmail: user.email,
          reportCount: events.reportCount,
          hiddenAt: events.hiddenAt,
          createdAt: events.createdAt,
        })
        .from(events)
        .innerJoin(user, eq(user.id, events.hostId))
        .where(or(gt(events.reportCount, 0), sql`${events.hiddenAt} is not null`))
        .orderBy(sql`${events.hiddenAt} desc nulls last`, desc(events.reportCount))
        .limit(limit);
      if (rows.length === 0) return [];

      const reportRows = await db
        .select({
          eventId: reports.eventId,
          reason: reports.reason,
          details: reports.details,
        })
        .from(reports)
        .where(
          inArray(
            reports.eventId,
            rows.map((row) => row.id),
          ),
        )
        .orderBy(desc(reports.createdAt));

      return rows.map((row): ModerationItem => {
        const mine = reportRows.filter((report) => report.eventId === row.id);
        const reasons: Partial<Record<ReportReason, number>> = {};
        for (const report of mine) reasons[report.reason] = (reasons[report.reason] ?? 0) + 1;
        return {
          ...row,
          reasons,
          recentDetails: mine
            .map((report) => report.details)
            .filter((details): details is string => Boolean(details))
            .slice(0, DETAILS_PER_EVENT),
        };
      });
    },

    async restoreEvent(eventId) {
      await db.delete(reports).where(eq(reports.eventId, eventId));
      await db.update(events).set({ reportCount: 0, hiddenAt: null }).where(eq(events.id, eventId));
    },

    async addAudit(entry) {
      await db.insert(adminAuditLog).values(entry);
    },

    async listAudit(limit) {
      return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
    },
  };
}
