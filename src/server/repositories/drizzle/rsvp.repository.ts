import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import { rsvps } from "@/db/schema";
import type { RsvpRepository } from "../interfaces";

export function createRsvpRepository(db: DatabaseOrTransaction): RsvpRepository {
  return {
    async findById(id) {
      const [row] = await db.select().from(rsvps).where(eq(rsvps.id, id)).limit(1);
      return row ?? null;
    },

    async listByEvent(eventId) {
      return db
        .select()
        .from(rsvps)
        .where(eq(rsvps.eventId, eventId))
        .orderBy(desc(rsvps.createdAt));
    },

    async countByEvent(eventId) {
      const [row] = await db
        .select({ value: count() })
        .from(rsvps)
        .where(eq(rsvps.eventId, eventId));
      return row?.value ?? 0;
    },

    async statsByEvent(eventId) {
      const [row] = await db
        .select({
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
        .from(rsvps)
        .where(eq(rsvps.eventId, eventId));
      const going = row?.going ?? 0;
      const maybe = row?.maybe ?? 0;
      const notGoing = row?.notGoing ?? 0;
      return {
        going,
        maybe,
        notGoing,
        total: going + maybe + notGoing,
        guests: going + (row?.plusOnes ?? 0),
      };
    },

    async listGoingNames(eventId, limit) {
      const rows = await db
        .select({ name: rsvps.name })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "going")))
        .orderBy(asc(rsvps.createdAt))
        .limit(limit);
      return rows.map((row) => row.name);
    },

    async listEmailRecipients(eventId) {
      return db
        .select({ id: rsvps.id, name: rsvps.name, email: rsvps.email })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), isNotNull(rsvps.email)));
    },

    async listMaybeRecipients(eventId) {
      return db
        .select({ id: rsvps.id, name: rsvps.name, email: rsvps.email })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "maybe"), isNotNull(rsvps.email)));
    },

    async claimReminderRecipients(eventId, now, respondedBefore) {
      return db
        .update(rsvps)
        .set({ reminderSentAt: now })
        .where(
          and(
            eq(rsvps.eventId, eventId),
            inArray(rsvps.status, ["going", "maybe"]),
            isNotNull(rsvps.email),
            isNull(rsvps.reminderSentAt),
            lte(rsvps.createdAt, respondedBefore),
          ),
        )
        .returning({ id: rsvps.id, name: rsvps.name, email: rsvps.email });
    },

    async create(input) {
      const [row] = await db.insert(rsvps).values(input).returning();
      if (!row) throw new Error("RSVP insert returned no row");
      return row;
    },

    async update(id, patch) {
      const [row] = await db.update(rsvps).set(patch).where(eq(rsvps.id, id)).returning();
      if (!row) throw new Error(`RSVP ${id} not found for update`);
      return row;
    },

    async delete(id) {
      await db.delete(rsvps).where(eq(rsvps.id, id));
    },

    async purgeContactDetails(eventId) {
      await db
        .update(rsvps)
        .set({ phone: null, email: null, editTokenHash: "purged" })
        .where(eq(rsvps.eventId, eventId));
    },
  };
}
