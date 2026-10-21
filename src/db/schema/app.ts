import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/* ----------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const themeEnum = pgEnum("theme", [
  "confetti",
  "wild",
  "sunset",
  "midnight",
  "clean",
  "velvet",
  "cyber",
  "aura",
  "oasis",
  "matcha",
]);
export const eventStatusEnum = pgEnum("event_status", ["active", "cancelled"]);
export const locationTypeEnum = pgEnum("location_type", ["physical", "online", "tbd"]);
export const guestListVisibilityEnum = pgEnum("guest_list_visibility", [
  "hidden",
  "count",
  "names",
]);
export const phoneModeEnum = pgEnum("phone_mode", ["required", "optional", "hidden"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "maybe", "not_going"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "event_created",
  "event_updated",
  "event_cancelled",
  "rsvp_created",
  "rsvp_updated",
  "rsvp_removed",
  "update_email_sent",
]);
export const emailAlertModeEnum = pgEnum("email_alert_mode", ["instant", "daily", "off"]);
export const reportReasonEnum = pgEnum("report_reason", ["spam", "scam", "inappropriate", "other"]);

/* ----------------------------------------------------------------------------
 * JSON column shapes
 * ------------------------------------------------------------------------- */

/** A custom question the host asks guests. Stored inside `events.custom_questions`. */
export type CustomQuestion = {
  id: string;
  label: string;
  type: "text" | "choice";
  required: boolean;
  /** Only for `choice` questions. */
  choices?: string[];
};

/** Guest answers keyed by `CustomQuestion.id`. */
export type CustomAnswers = Record<string, string>;

/** Extra details attached to an activity entry, shown in the host's timeline. */
export type ActivityData = {
  guestName?: string;
  from?: string;
  to?: string;
  changes?: string[];
};

/* ----------------------------------------------------------------------------
 * Tables
 * ------------------------------------------------------------------------- */

export const userSettings = pgTable("user_settings", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailAlerts: emailAlertModeEnum().notNull().default("instant"),
  pushAlerts: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    hostId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Lower-case public link, e.g. `linas-bday` → comeby.org/linas-bday. */
    slug: text().notNull(),
    title: text().notNull(),
    description: text().notNull().default(""),
    hostName: text().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    /** IANA time zone the host planned the event in, e.g. `Asia/Beirut`. */
    timezone: text().notNull(),
    locationType: locationTypeEnum().notNull().default("physical"),
    locationName: text(),
    locationAddress: text(),
    onlineUrl: text(),
    theme: themeEnum().notNull().default("confetti"),
    coverImageKey: text(),
    status: eventStatusEnum().notNull().default("active"),
    cancelMessage: text(),
    guestListVisibility: guestListVisibilityEnum().notNull().default("count"),
    phoneMode: phoneModeEnum().notNull().default("optional"),
    allowMessage: boolean().notNull().default(true),
    allowPlusOnes: boolean().notNull().default(false),
    maxPlusOnes: smallint().notNull().default(0),
    customQuestions: jsonb().$type<CustomQuestion[]>().notNull().default([]),
    rsvpDeadline: timestamp({ withTimezone: true }),
    rsvpClosed: boolean().notNull().default(false),
    updateEmailsSent: smallint().notNull().default(0),
    /** When the time, place or details last changed in a way guests should notice. */
    lastNotableUpdateAt: timestamp({ withTimezone: true }),
    lastNotableUpdateSummary: text(),
    /** Set when enough reports arrive; hidden events show a "under review" page. */
    hiddenAt: timestamp({ withTimezone: true }),
    reportCount: integer().notNull().default(0),
    guestDataPurgedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("events_slug_idx").on(table.slug),
    index("events_host_id_starts_at_idx").on(table.hostId, table.startsAt),
    index("events_ends_purge_idx").on(table.startsAt, table.guestDataPurgedAt),
  ],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum().notNull(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    message: text(),
    plusOnes: smallint().notNull().default(0),
    answers: jsonb().$type<CustomAnswers>().notNull().default({}),
    /** SHA-256 of the secret that lets the guest edit this response later. */
    editTokenHash: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("rsvps_event_id_created_at_idx").on(table.eventId, table.createdAt)],
);

export const eventActivity = pgTable(
  "event_activity",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    rsvpId: uuid().references(() => rsvps.id, { onDelete: "set null" }),
    type: activityTypeEnum().notNull(),
    data: jsonb().$type<ActivityData>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_activity_event_id_created_at_idx").on(table.eventId, table.createdAt)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text().notNull(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
    index("push_subscriptions_user_id_idx").on(table.userId),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    reason: reportReasonEnum().notNull(),
    details: text(),
    /** Salted hash of the reporter's network, so one person can't report the same event twice. */
    reporterHash: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reports_event_reporter_idx").on(table.eventId, table.reporterHash)],
);

/** Fixed-window counters used for rate limits and daily quotas. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    count: integer().notNull().default(0),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limits_expires_at_idx").on(table.expiresAt)],
);
