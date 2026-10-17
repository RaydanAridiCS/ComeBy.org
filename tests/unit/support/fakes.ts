import type { JobName, JobPayloads, JobQueue } from "@/server/jobs/types";
import type { Repositories } from "@/server/repositories/interfaces";
import type {
  ActivityRecord,
  EventRecord,
  RsvpRecord,
  RsvpStats,
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
  setNow: (date: Date) => void;
};

export function createFakeWorld(start = new Date("2026-10-17T12:00:00Z")): FakeWorld {
  let now = start;
  const events = new Map<string, EventRecord>();
  const rsvps = new Map<string, RsvpRecord>();
  const activity: ActivityRecord[] = [];
  const jobs: { name: JobName; data: unknown }[] = [];
  const counters = new Map<string, number>();

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

  const notImplemented = (): never => {
    throw new Error("not implemented in fake");
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
      listDueForGuestDataPurge: async () => [],
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
      purgeContactDetails: async () => undefined,
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
      listByEvent: async (eventId, limit) =>
        activity
          .filter((a) => a.eventId === eventId)
          .slice(-limit)
          .reverse(),
      listRsvpActivityForHostSince: notImplemented,
    },
    users: { findById: async () => null, listIdsWithRsvpActivitySince: async () => [] },
    userSettings: {
      get: async (userId) => ({
        userId,
        emailAlerts: "instant",
        pushAlerts: true,
        createdAt: now,
        updatedAt: now,
      }),
      upsert: notImplemented,
    },
    pushSubscriptions: {
      upsert: async () => undefined,
      listByUser: async () => [],
      deleteByEndpoint: async () => undefined,
    },
    reports: { create: async () => true },
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
    setNow: (date) => {
      now = date;
    },
  };
}
