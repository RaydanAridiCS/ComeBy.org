import type { JobName, JobPayloads, JobQueue } from "@/server/jobs/types";
import type { Repositories } from "@/server/repositories/interfaces";
import type {
  ActivityRecord,
  AuditEntryRecord,
  EventRecord,
  HostSummary,
  RsvpRecord,
  RsvpStats,
  SuppressionReason,
  UserSettingsRecord,
} from "@/server/repositories/types";
import type { ServiceDeps } from "@/server/services/deps";

/*
 * In-memory repositories implementing just enough behaviour for service tests.
 * This is the payoff of the repository pattern: business rules run without a database.
 */

let idCounter = 0;
const nextId = () => `00000000-0000-7000-8000-${String(++idCounter).padStart(12, "0")}`;

export function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  const now = new Date("2026-10-17T12:00:00Z");
  return {
    id: nextId(),
    hostId: "host-1",
    slug: `event-${idCounter}`,
    title: "Picnic",
    description: "",
    hostName: "Lina",
    startsAt: new Date("2026-10-20T16:00:00Z"),
    endsAt: null,
    timezone: "UTC",
    locationType: "physical",
    locationName: "Park",
    locationAddress: null,
    onlineUrl: null,
    theme: "confetti",
    coverImageKey: null,
    status: "active",
    cancelMessage: null,
    guestListVisibility: "count",
    phoneMode: "optional",
    allowMessage: true,
    allowPlusOnes: false,
    maxPlusOnes: 0,
    customQuestions: [],
    rsvpDeadline: null,
    rsvpClosed: false,
    updateEmailsSent: 0,
    reminderEnabled: true,
    nudgeSentAt: null,
    lastNotableUpdateAt: null,
    lastNotableUpdateSummary: null,
    hiddenAt: null,
    reportCount: 0,
    guestDataPurgedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export type FakeWorld = {
  deps: ServiceDeps;
  events: Map<string, EventRecord>;
  rsvps: Map<string, RsvpRecord>;
  activity: ActivityRecord[];
  jobs: { name: JobName; data: unknown }[];
  counters: Map<string, number>;
  users: Map<string, HostSummary>;
  settings: Map<string, UserSettingsRecord>;
  suppressions: Map<string, SuppressionReason>;
  audit: AuditEntryRecord[];
  reportRows: { eventId: string }[];
  inviteeEmails: Map<string, string[]>;
  setNow: (date: Date) => void;
};

export function createFakeWorld(start = new Date("2026-10-17T12:00:00Z")): FakeWorld {
  let now = start;
  const events = new Map<string, EventRecord>();
  const rsvps = new Map<string, RsvpRecord>();
  const activity: ActivityRecord[] = [];
  const jobs: { name: JobName; data: unknown }[] = [];
  const counters = new Map<string, number>();
  const users = new Map<string, HostSummary>();
  const settings = new Map<string, UserSettingsRecord>();
  const suppressions = new Map<string, SuppressionReason>();
  const audit: AuditEntryRecord[] = [];
  const reportRows: { eventId: string }[] = [];
  const inviteeEmails = new Map<string, string[]>();

  /** Mirrors the real reminder query: going or maybe, has an email, not yet reminded, not brand new. */
  const isOwedReminder = (rsvp: RsvpRecord, eventId: string, respondedBefore: Date) =>
    rsvp.eventId === eventId &&
    (rsvp.status === "going" || rsvp.status === "maybe") &&
    Boolean(rsvp.email) &&
    !rsvp.reminderSentAt &&
    rsvp.createdAt <= respondedBefore;

  const stats = (eventId: string): RsvpStats => {
    const list = [...rsvps.values()].filter((r) => r.eventId === eventId);
    const going = list.filter((r) => r.status === "going");
    return {
      going: going.length,
      maybe: list.filter((r) => r.status === "maybe").length,
      notGoing: list.filter((r) => r.status === "not_going").length,
      total: list.length,
      guests: going.length + going.reduce((sum, r) => sum + r.plusOnes, 0),
    };
  };

  const repos: Repositories = {
    events: {
      findById: async (id) => events.get(id) ?? null,
      findBySlug: async (slug) => [...events.values()].find((e) => e.slug === slug) ?? null,
      slugExists: async (slug) => [...events.values()].some((e) => e.slug === slug),
      lockById: async (id) => events.get(id) ?? null,
      listByHostWithStats: async (hostId) =>
        [...events.values()]
          .filter((e) => e.hostId === hostId)
          .map((e) => ({ ...e, stats: stats(e.id) })),
      countActiveByHost: async (hostId, at) =>
        [...events.values()].filter((e) => {
          const end = e.endsAt ?? new Date(e.startsAt.getTime() + 6 * 3600_000);
          return e.hostId === hostId && e.status === "active" && end > at;
        }).length,
      countCreatedByHostSince: async (hostId, since) =>
        [...events.values()].filter((e) => e.hostId === hostId && e.createdAt >= since).length,
      create: async (input) => {
        const event = makeEvent({
          ...(input as Partial<EventRecord>),
          createdAt: now,
          updatedAt: now,
        });
        events.set(event.id, event);
        return event;
      },
      update: async (id, patch) => {
        const existing = events.get(id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...(patch as Partial<EventRecord>), updatedAt: now };
        events.set(id, updated);
        return updated;
      },
      delete: async (id) => void events.delete(id),
      incrementUpdateEmailsSent: async (id) => {
        const event = events.get(id);
        if (event) events.set(id, { ...event, updateEmailsSent: event.updateEmailsSent + 1 });
      },
      incrementReportCount: async (id) => {
        const event = events.get(id);
        if (!event) return 0;
        events.set(id, { ...event, reportCount: event.reportCount + 1 });
        return event.reportCount + 1;
      },
      listDueForGuestDataPurge: async (endedBefore, limit) =>
        [...events.values()]
          .filter(
            (e) =>
              !e.guestDataPurgedAt && (e.endsAt ?? e.startsAt).getTime() < endedBefore.getTime(),
          )
          .slice(0, limit)
          .map(({ id }) => ({ id })),
      listDueForReminder: async (at, windowEnd, respondedBefore, limit) =>
        [...events.values()]
          .filter(
            (e) =>
              e.status === "active" &&
              e.reminderEnabled &&
              !e.hiddenAt &&
              !e.guestDataPurgedAt &&
              e.startsAt > at &&
              e.startsAt <= windowEnd &&
              [...rsvps.values()].some((r) => isOwedReminder(r, e.id, respondedBefore)),
          )
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .slice(0, limit),
      claimNudge: async (id, at) => {
        const event = events.get(id);
        if (!event || event.nudgeSentAt) return false;
        events.set(id, { ...event, nudgeSentAt: at });
        return true;
      },
    },
    rsvps: {
      findById: async (id) => rsvps.get(id) ?? null,
      listByEvent: async (eventId) => [...rsvps.values()].filter((r) => r.eventId === eventId),
      countByEvent: async (eventId) =>
        [...rsvps.values()].filter((r) => r.eventId === eventId).length,
      statsByEvent: async (eventId) => stats(eventId),
      listGoingNames: async (eventId, limit) =>
        [...rsvps.values()]
          .filter((r) => r.eventId === eventId && r.status === "going")
          .slice(0, limit)
          .map((r) => r.name),
      listEmailRecipients: async (eventId) =>
        [...rsvps.values()]
          .filter((r) => r.eventId === eventId && r.email)
          .map(({ id, name, email }) => ({ id, name, email })),
      listMaybeRecipients: async (eventId) =>
        [...rsvps.values()]
          .filter((r) => r.eventId === eventId && r.status === "maybe" && r.email)
          .map(({ id, name, email }) => ({ id, name, email })),
      claimReminderRecipients: async (eventId, at, respondedBefore) => {
        const claimed: Pick<RsvpRecord, "id" | "name" | "email">[] = [];
        for (const [id, rsvp] of rsvps) {
          if (!isOwedReminder(rsvp, eventId, respondedBefore)) continue;
          rsvps.set(id, { ...rsvp, reminderSentAt: at });
          claimed.push({ id, name: rsvp.name, email: rsvp.email });
        }
        return claimed;
      },
      create: async (input) => {
        const rsvp: RsvpRecord = {
          id: nextId(),
          eventId: input.eventId,
          status: input.status,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          message: input.message ?? null,
          plusOnes: input.plusOnes ?? 0,
          answers: input.answers ?? {},
          editTokenHash: input.editTokenHash,
          reminderSentAt: null,
          createdAt: now,
          updatedAt: now,
        };
        rsvps.set(rsvp.id, rsvp);
        return rsvp;
      },
      update: async (id, patch) => {
        const existing = rsvps.get(id);
        if (!existing) throw new Error("missing");
        const updated = { ...existing, ...(patch as Partial<RsvpRecord>), updatedAt: now };
        rsvps.set(id, updated);
        return updated;
      },
      delete: async (id) => void rsvps.delete(id),
      purgeContactDetails: async (eventId) => {
        for (const [id, rsvp] of rsvps) {
          if (rsvp.eventId === eventId) rsvps.set(id, { ...rsvp, phone: null, email: null });
        }
      },
    },
    invitees: {
      addMany: async (eventId, emails) => {
        const list = inviteeEmails.get(eventId) ?? [];
        for (const email of emails) {
          if (!list.includes(email.toLowerCase())) list.push(email.toLowerCase());
        }
        inviteeEmails.set(eventId, list);
      },
      listEmails: async (eventId) => [...(inviteeEmails.get(eventId) ?? [])],
      deleteByEvent: async (eventId) => void inviteeEmails.delete(eventId),
    },
    activity: {
      add: async (input) => {
        const record: ActivityRecord = {
          id: nextId(),
          eventId: input.eventId,
          rsvpId: input.rsvpId ?? null,
          type: input.type,
          data: input.data ?? {},
          createdAt: now,
        };
        activity.push(record);
        return record;
      },
      scrubGuestName: async (rsvpId) => {
        for (const entry of activity) {
          if (entry.rsvpId === rsvpId) delete entry.data.guestName;
        }
      },
      listByEvent: async (eventId, limit) =>
        activity
          .filter((a) => a.eventId === eventId)
          .slice(-limit)
          .reverse(),
      listRsvpActivityForHostSince: async (hostId, since) =>
        activity
          .filter((a) => {
            const event = events.get(a.eventId);
            return (
              event?.hostId === hostId &&
              a.createdAt >= since &&
              (a.type === "rsvp_created" || a.type === "rsvp_updated")
            );
          })
          .map((a) => {
            const event = events.get(a.eventId);
            return { ...a, eventTitle: event?.title ?? "", eventSlug: event?.slug ?? "" };
          }),
    },
    users: {
      findById: async (id) => users.get(id) ?? null,
      findByEmail: async (email) => [...users.values()].find((u) => u.email === email) ?? null,
      listIdsWithRsvpActivitySince: async (since) => [
        ...new Set(
          activity
            .filter((a) => a.createdAt >= since && a.type.startsWith("rsvp_"))
            .map((a) => events.get(a.eventId)?.hostId)
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    },
    userSettings: {
      get: async (userId) =>
        settings.get(userId) ?? {
          userId,
          emailAlerts: "instant",
          pushAlerts: true,
          createdAt: now,
          updatedAt: now,
        },
      upsert: async (userId, patch) => {
        const current = settings.get(userId) ?? {
          userId,
          emailAlerts: "instant" as const,
          pushAlerts: true,
          createdAt: now,
          updatedAt: now,
        };
        const updated = { ...current, ...patch, updatedAt: now };
        settings.set(userId, updated);
        return updated;
      },
    },
    pushSubscriptions: {
      upsert: async () => undefined,
      listByUser: async () => [],
      deleteByEndpoint: async () => undefined,
    },
    reports: {
      create: async (input) => {
        reportRows.push({ eventId: input.eventId });
        return true;
      },
    },
    rateLimits: {
      hit: async (key, windowMs, at) => {
        const fullKey = `${key}@${Math.floor(at.getTime() / windowMs)}`;
        const count = (counters.get(fullKey) ?? 0) + 1;
        counters.set(fullKey, count);
        return count;
      },
      peek: async (key, windowMs, at) =>
        counters.get(`${key}@${Math.floor(at.getTime() / windowMs)}`) ?? 0,
      deleteExpired: async () => 0,
    },
    admin: {
      listModerationQueue: async (limit) =>
        [...events.values()]
          .filter((e) => e.reportCount > 0 || e.hiddenAt)
          .slice(0, limit)
          .map((e) => ({
            id: e.id,
            slug: e.slug,
            title: e.title,
            status: e.status,
            hostName: users.get(e.hostId)?.name ?? "",
            hostEmail: users.get(e.hostId)?.email ?? "",
            reportCount: e.reportCount,
            hiddenAt: e.hiddenAt,
            createdAt: e.createdAt,
            reasons: {},
            recentDetails: [],
          })),
      restoreEvent: async (eventId) => {
        const event = events.get(eventId);
        if (event) events.set(eventId, { ...event, reportCount: 0, hiddenAt: null });
        for (let i = reportRows.length - 1; i >= 0; i--) {
          if (reportRows[i]?.eventId === eventId) reportRows.splice(i, 1);
        }
      },
      addAudit: async (entry) => {
        audit.push({
          id: nextId(),
          adminId: entry.adminId ?? null,
          adminEmail: entry.adminEmail,
          action: entry.action,
          eventId: entry.eventId,
          eventTitle: entry.eventTitle,
          eventSlug: entry.eventSlug,
          createdAt: now,
        });
      },
      listAudit: async (limit) => [...audit].reverse().slice(0, limit),
    },
    emailSuppressions: {
      find: async (email) => suppressions.get(email) ?? null,
      add: async (email, reason) => {
        // Mirrors the real repository: a bounce or complaint is never downgraded.
        if (!suppressions.has(email) || suppressions.get(email) === "unsubscribed") {
          suppressions.set(email, reason);
        }
      },
    },
  };

  const jobQueue: JobQueue = {
    enqueue: async <K extends JobName>(name: K, data: JobPayloads[K]) => {
      jobs.push({ name, data });
    },
  };

  return {
    deps: { repos, transaction: (work) => work(repos), jobs: jobQueue, now: () => now },
    events,
    rsvps,
    activity,
    jobs,
    counters,
    users,
    settings,
    suppressions,
    audit,
    reportRows,
    inviteeEmails,
    setNow: (date) => {
      now = date;
    },
  };
}
