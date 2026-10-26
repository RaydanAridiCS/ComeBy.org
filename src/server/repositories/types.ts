import type {
  adminAuditLog,
  emailSuppressions,
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
export type SuppressionReason = typeof emailSuppressions.$inferSelect.reason;

export type AuditEntryRecord = typeof adminAuditLog.$inferSelect;
export type NewAuditEntryRecord = typeof adminAuditLog.$inferInsert;
export type ReportReason = typeof reports.$inferSelect.reason;

/** One event in the moderation queue: reported at least once, or hidden. */
export type ModerationItem = {
  id: string;
  slug: string;
  title: string;
  status: EventRecord["status"];
  hostName: string;
  hostEmail: string;
  reportCount: number;
  hiddenAt: Date | null;
  createdAt: Date;
  /** How many reports gave each reason. */
  reasons: Partial<Record<ReportReason, number>>;
  /** The most recent reporter comments (free text from the public, so display as plain text). */
  recentDetails: string[];
};

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
