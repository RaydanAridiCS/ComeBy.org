import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import { eventActivity, events } from "@/db/schema";
import type { ActivityRepository } from "../interfaces";

const RSVP_ACTIVITY = ["rsvp_created", "rsvp_updated"] as const;

export function createActivityRepository(db: DatabaseOrTransaction): ActivityRepository {
  return {
    async add(input) {
      const [row] = await db.insert(eventActivity).values(input).returning();
      if (!row) throw new Error("Activity insert returned no row");
      return row;
    },

    async scrubGuestName(rsvpId) {
      await db
        .update(eventActivity)
        .set({ data: sql`${eventActivity.data} - 'guestName'` })
        .where(eq(eventActivity.rsvpId, rsvpId));
    },

    async listByEvent(eventId, limit) {
      return db
        .select()
        .from(eventActivity)
        .where(eq(eventActivity.eventId, eventId))
        .orderBy(desc(eventActivity.createdAt))
        .limit(limit);
    },

    async listRsvpActivityForHostSince(hostId, since) {
      const rows = await db
        .select({ activity: eventActivity, eventTitle: events.title, eventSlug: events.slug })
        .from(eventActivity)
        .innerJoin(events, eq(events.id, eventActivity.eventId))
        .where(
          and(
            eq(events.hostId, hostId),
            gte(eventActivity.createdAt, since),
            inArray(eventActivity.type, [...RSVP_ACTIVITY]),
          ),
        )
        .orderBy(desc(eventActivity.createdAt))
        .limit(500);
      return rows.map(({ activity, eventTitle, eventSlug }) => ({
        ...activity,
        eventTitle,
        eventSlug,
      }));
    },
  };
}
