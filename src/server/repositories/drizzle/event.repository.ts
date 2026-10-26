import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import { events, rsvps } from "@/db/schema";
import type { EventRepository } from "../interfaces";
import type { EventWithStats, RsvpStats } from "../types";

/** SQL for "the moment this event counts as over" (end time, or 6h after start). */
const eventEndSql = sql`coalesce(${events.endsAt}, ${events.startsAt} + interval '6 hours')`;

export function createEventRepository(db: DatabaseOrTransaction): EventRepository {
  return {
    async findById(id) {
      const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
      return row ?? null;
    },

    async findBySlug(slug) {
      const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
      return row ?? null;
    },

    async slugExists(slug) {
      const [row] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1);
      return Boolean(row);
    },

    async lockById(id) {
      const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1).for("update");
      return row ?? null;
    },

    async listByHostWithStats(hostId) {
      const rows = await db
        .select({
          event: events,
          going: sql<number>`count(*) filter (where ${rsvps.status} = 'going')`.mapWith(Number),
          maybe: sql<number>`count(*) filter (where ${rsvps.status} = 'maybe')`.mapWith(Number),
          notGoing: sql<number>`count(*) filter (where ${rsvps.status} = 'not_going')`.mapWith(
            Number,
          ),
          plusOnes:
            sql<number>`coalesce(sum(${rsvps.plusOnes}) filter (where ${rsvps.status} = 'going'), 0)`.mapWith(
              Number,
            ),
        })
        .from(events)
        .leftJoin(rsvps, eq(rsvps.eventId, events.id))
        .where(eq(events.hostId, hostId))
        .groupBy(events.id)
        .orderBy(desc(events.startsAt));

      return rows.map(({ event, going, maybe, notGoing, plusOnes }): EventWithStats => {
        const stats: RsvpStats = {
          going,
          maybe,
          notGoing,
          total: going + maybe + notGoing,
          guests: going + plusOnes,
        };
        return { ...event, stats };
      });
    },

    async countActiveByHost(hostId, now) {
      const [row] = await db
        .select({ value: count() })
        .from(events)
        .where(
          and(
            eq(events.hostId, hostId),
            eq(events.status, "active"),
            sql`${eventEndSql} > ${now.toISOString()}::timestamptz`,
          ),
        );
      return row?.value ?? 0;
    },

    async countCreatedByHostSince(hostId, since) {
      const [row] = await db
        .select({ value: count() })
        .from(events)
        .where(and(eq(events.hostId, hostId), gte(events.createdAt, since)));
      return row?.value ?? 0;
    },

    async create(input) {
      const [row] = await db.insert(events).values(input).returning();
      if (!row) throw new Error("Event insert returned no row");
      return row;
    },

    async update(id, patch) {
      const [row] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
      if (!row) throw new Error(`Event ${id} not found for update`);
      return row;
    },

    async delete(id) {
      await db.delete(events).where(eq(events.id, id));
    },

    async incrementUpdateEmailsSent(id) {
      await db
        .update(events)
        .set({ updateEmailsSent: sql`${events.updateEmailsSent} + 1` })
        .where(eq(events.id, id));
    },

    async incrementReportCount(id) {
      const [row] = await db
        .update(events)
        .set({ reportCount: sql`${events.reportCount} + 1` })
        .where(eq(events.id, id))
        .returning({ reportCount: events.reportCount });
      return row?.reportCount ?? 0;
    },

    async listDueForGuestDataPurge(endedBefore, limit) {
      return db
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            isNull(events.guestDataPurgedAt),
            or(
              sql`${eventEndSql} < ${endedBefore.toISOString()}::timestamptz`,
              and(eq(events.status, "cancelled"), lt(events.updatedAt, endedBefore)),
            ),
          ),
        )
        .orderBy(asc(events.startsAt))
        .limit(limit);
    },

    async listDueForReminder(now, windowEnd, guestsRespondedBefore, limit) {
      return db
        .select()
        .from(events)
        .where(
          and(
            eq(events.status, "active"),
            eq(events.reminderEnabled, true),
            isNull(events.hiddenAt),
            isNull(events.guestDataPurgedAt),
            sql`${events.startsAt} > ${now.toISOString()}::timestamptz`,
            lte(events.startsAt, windowEnd),
            exists(
              db
                .select({ one: sql`1` })
                .from(rsvps)
                .where(
                  and(
                    eq(rsvps.eventId, events.id),
                    inArray(rsvps.status, ["going", "maybe"]),
                    isNotNull(rsvps.email),
                    isNull(rsvps.reminderSentAt),
                    lte(rsvps.createdAt, guestsRespondedBefore),
                  ),
                ),
            ),
          ),
        )
        .orderBy(asc(events.startsAt))
        .limit(limit);
    },

    async claimNudge(id, now) {
      const rows = await db
        .update(events)
        .set({ nudgeSentAt: now })
        .where(and(eq(events.id, id), isNull(events.nudgeSentAt)))
        .returning({ id: events.id });
      return rows.length > 0;
    },
  };
}

export { eventEndSql };
