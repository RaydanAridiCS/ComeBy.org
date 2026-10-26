import type {
  ActivityRecord,
  AuditEntryRecord,
  EventPatch,
  EventRecord,
  EventWithStats,
  HostSummary,
  ModerationItem,
  NewActivityRecord,
  NewAuditEntryRecord,
  NewEventRecord,
  NewPushSubscriptionRecord,
  NewReportRecord,
  NewRsvpRecord,
  PushSubscriptionRecord,
  RsvpPatch,
  RsvpRecord,
  RsvpStats,
  SuppressionReason,
  UserSettingsRecord,
} from "./types";

/*
 * Repository contracts. Services depend on these interfaces, not on Drizzle, which
 * keeps business rules testable with simple in-memory fakes (see tests/fakes).
 */

export interface EventRepository {
  findById(id: string): Promise<EventRecord | null>;
  findBySlug(slug: string): Promise<EventRecord | null>;
  slugExists(slug: string): Promise<boolean>;
  /** Locks the event row until the surrounding transaction ends. */
  lockById(id: string): Promise<EventRecord | null>;
  listByHostWithStats(hostId: string): Promise<EventWithStats[]>;
  /** Events that are not cancelled and haven't ended yet at `now`. */
  countActiveByHost(hostId: string, now: Date): Promise<number>;
  countCreatedByHostSince(hostId: string, since: Date): Promise<number>;
  create(input: NewEventRecord): Promise<EventRecord>;
  update(id: string, patch: EventPatch): Promise<EventRecord>;
  delete(id: string): Promise<void>;
  incrementUpdateEmailsSent(id: string): Promise<void>;
  /** Adds one report and returns the new total. */
  incrementReportCount(id: string): Promise<number>;
  /** Events whose guest contact details are due for deletion. */
  listDueForGuestDataPurge(endedBefore: Date, limit: number): Promise<Pick<EventRecord, "id">[]>;
  /**
   * Active, visible events starting between `now` and `windowEnd` that have at least one guest
   * still owed a reminder (going or maybe, with an email, who responded before `guestsRespondedBefore`).
   */
  listDueForReminder(
    now: Date,
    windowEnd: Date,
    guestsRespondedBefore: Date,
    limit: number,
  ): Promise<EventRecord[]>;
  /** Marks the event as nudged. Returns `false` when it already was (so only one caller wins). */
  claimNudge(id: string, now: Date): Promise<boolean>;
}

export interface RsvpRepository {
  findById(id: string): Promise<RsvpRecord | null>;
  listByEvent(eventId: string): Promise<RsvpRecord[]>;
  countByEvent(eventId: string): Promise<number>;
  statsByEvent(eventId: string): Promise<RsvpStats>;
  /** Names of guests who said "going" (for public guest lists), oldest first. */
  listGoingNames(eventId: string, limit: number): Promise<string[]>;
  /** Guests who left an email for updates. */
  listEmailRecipients(eventId: string): Promise<Pick<RsvpRecord, "id" | "name" | "email">[]>;
  /** Guests who said "maybe" and left an email. */
  listMaybeRecipients(eventId: string): Promise<Pick<RsvpRecord, "id" | "name" | "email">[]>;
  /**
   * Marks every guest still owed a reminder as reminded and returns them. Atomic, so two
   * overlapping sweeps never hand out the same guest twice.
   */
  claimReminderRecipients(
    eventId: string,
    now: Date,
    respondedBefore: Date,
  ): Promise<Pick<RsvpRecord, "id" | "name" | "email">[]>;
  create(input: NewRsvpRecord): Promise<RsvpRecord>;
  update(id: string, patch: RsvpPatch): Promise<RsvpRecord>;
  delete(id: string): Promise<void>;
  /** Removes phone numbers, emails and edit links for every guest of an event. */
  purgeContactDetails(eventId: string): Promise<void>;
}

export interface InviteeRepository {
  /** Stores lower-cased addresses, ignoring ones already on the event's list. */
  addMany(eventId: string, emails: string[]): Promise<void>;
  listEmails(eventId: string): Promise<string[]>;
  deleteByEvent(eventId: string): Promise<void>;
}

export interface ActivityRepository {
  add(input: NewActivityRecord): Promise<ActivityRecord>;
  /** Removes the guest's name from every timeline entry about one response. */
  scrubGuestName(rsvpId: string): Promise<void>;
  listByEvent(eventId: string, limit: number): Promise<ActivityRecord[]>;
  /** RSVP activity across all of a host's events since `since`, for daily summaries. */
  listRsvpActivityForHostSince(
    hostId: string,
    since: Date,
  ): Promise<(ActivityRecord & { eventTitle: string; eventSlug: string })[]>;
}

export interface UserRepository {
  findById(id: string): Promise<HostSummary | null>;
  findByEmail(email: string): Promise<HostSummary | null>;
  /** Hosts with at least one RSVP change on any of their events since `since`. */
  listIdsWithRsvpActivitySince(since: Date): Promise<string[]>;
}

export interface UserSettingsRepository {
  /** Returns stored settings, or the defaults when the host never changed them. */
  get(userId: string): Promise<UserSettingsRecord>;
  upsert(
    userId: string,
    patch: Partial<Pick<UserSettingsRecord, "emailAlerts" | "pushAlerts">>,
  ): Promise<UserSettingsRecord>;
}

export interface PushSubscriptionRepository {
  upsert(input: NewPushSubscriptionRecord): Promise<void>;
  listByUser(userId: string): Promise<PushSubscriptionRecord[]>;
  deleteByEndpoint(endpoint: string): Promise<void>;
}

export interface ReportRepository {
  /** Returns `false` when this reporter already reported the event. */
  create(input: NewReportRecord): Promise<boolean>;
}

export interface EmailSuppressionRepository {
  /** Why an address is suppressed, or `null` when we may email it. */
  find(email: string): Promise<SuppressionReason | null>;
  /** Suppresses an address. A bounce or complaint is never downgraded to an unsubscribe. */
  add(email: string, reason: SuppressionReason): Promise<void>;
}

export interface AdminRepository {
  /** Reported or hidden events, hidden ones first, then the most reported. */
  listModerationQueue(limit: number): Promise<ModerationItem[]>;
  /** Clears an event's reports and un-hides it. */
  restoreEvent(eventId: string): Promise<void>;
  addAudit(entry: NewAuditEntryRecord): Promise<void>;
  listAudit(limit: number): Promise<AuditEntryRecord[]>;
}

export interface RateLimitRepository {
  /** Adds one hit to `key` and returns the count in the current window. */
  hit(key: string, windowMs: number, now: Date): Promise<number>;
  /** Current count for `key` without adding a hit. */
  peek(key: string, windowMs: number, now: Date): Promise<number>;
  deleteExpired(now: Date): Promise<number>;
}

/** Every repository, bound to one database connection or transaction. */
export type Repositories = {
  events: EventRepository;
  rsvps: RsvpRepository;
  invitees: InviteeRepository;
  activity: ActivityRepository;
  users: UserRepository;
  userSettings: UserSettingsRepository;
  pushSubscriptions: PushSubscriptionRepository;
  reports: ReportRepository;
  rateLimits: RateLimitRepository;
  emailSuppressions: EmailSuppressionRepository;
  admin: AdminRepository;
};

/** Runs `work` inside a database transaction with repositories bound to it. */
export type TransactionRunner = <T>(work: (repos: Repositories) => Promise<T>) => Promise<T>;
