import type {
  eventActivity,
  events,
  pushSubscriptions,
  reports,
  rsvps,
  userSettings,
} from "@/db/schema";

/*
 * Plain record types shared by repositories and services. Services never import
 * Drizzle directly; they only see these shapes and the repository interfaces.
 */

export type EventRecord = typeof events.$inferSelect;
export type NewEventRecord = typeof events.$inferInsert;
export type EventPatch = Partial<Omit<NewEventRecord, "id" | "hostId" | "createdAt">>;

export type RsvpRecord = typeof rsvps.$inferSelect;
export type NewRsvpRecord = typeof rsvps.$inferInsert;
export type RsvpPatch = Partial<Omit<NewRsvpRecord, "id" | "eventId" | "createdAt">>;
export type RsvpStatus = RsvpRecord["status"];

export type ActivityRecord = typeof eventActivity.$inferSelect;
export type NewActivityRecord = typeof eventActivity.$inferInsert;

export type UserSettingsRecord = typeof userSettings.$inferSelect;
export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRecord = typeof pushSubscriptions.$inferInsert;
export type NewReportRecord = typeof reports.$inferInsert;

export type HostSummary = { id: string; name: string; email: string };

/** Headcount for an event. `guests` adds everyone's +1s to the "going" count. */
export type RsvpStats = {
  going: number;
  maybe: number;
  notGoing: number;
  total: number;
  /** People attending including +1s. */
  guests: number;
};

export type EventWithStats = EventRecord & { stats: RsvpStats };
