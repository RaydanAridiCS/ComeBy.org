import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { nudgeSchema } from "@/features/events/schema";
import { createEventService } from "@/server/services/event.service";
import { createNotificationService } from "@/server/services/notification.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

type EmailJob = {
  to: string;
  subject: string;
  category: string;
  headers?: Record<string, string>;
};

const emailJobs = (world: FakeWorld) =>
  world.jobs.filter((job) => job.name === "email.send").map((job) => job.data as EmailJob);

const START = new Date("2026-10-20T16:00:00Z");
/** Six hours before the default event starts: inside the 24 hour reminder window. */
const SIX_HOURS_BEFORE = new Date("2026-10-20T10:00:00Z");

describe("guest reminders", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createNotificationService>;

  beforeEach(() => {
    // The world starts on Oct 17, days before the event, so guests added now are old enough.
    world = createFakeWorld();
    service = createNotificationService(world.deps);
    world.events.set("event-1", makeEvent({ id: "event-1", startsAt: START, title: "Picnic" }));
  });

  async function respond(
    status: "going" | "maybe" | "not_going",
    name: string,
    email: string | null,
  ) {
    return world.deps.repos.rsvps.create({
      eventId: "event-1",
      status,
      name,
      email,
      editTokenHash: "hash",
    });
  }

  it("sends going and maybe guests one reminder, with unsubscribe links", async () => {
    await respond("going", "Omar", "omar@example.com");
    await respond("maybe", "Noor", "noor@example.com");
    world.setNow(SIX_HOURS_BEFORE);

    await service.handleRemindersDue();

    const emails = emailJobs(world);
    expect(emails.map((email) => email.to).sort()).toEqual([
      "noor@example.com",
      "omar@example.com",
    ]);
    for (const email of emails) {
      expect(email.subject).toContain("Picnic");
      expect(email.category).toBe("guest-update");
      expect(email.headers?.["List-Unsubscribe"]).toBeTruthy();
    }
  });

  it("never sends the same guest a second reminder", async () => {
    await respond("going", "Omar", "omar@example.com");
    world.setNow(SIX_HOURS_BEFORE);
    await service.handleRemindersDue();
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(1);
  });

  it("sends once even when two sweeps overlap", async () => {
    await respond("going", "Omar", "omar@example.com");
    world.setNow(SIX_HOURS_BEFORE);
    await Promise.all([service.handleRemindersDue(), service.handleRemindersDue()]);
    expect(emailJobs(world)).toHaveLength(1);
  });

  it("skips guests who can't go and guests without an email", async () => {
    await respond("not_going", "Lina", "lina@example.com");
    await respond("going", "Karim", null);
    world.setNow(SIX_HOURS_BEFORE);
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(0);
  });

  it("waits for guests who only just responded", async () => {
    world.setNow(new Date(SIX_HOURS_BEFORE.getTime() - 60 * 60 * 1000));
    await respond("going", "Omar", "omar@example.com");
    world.setNow(SIX_HOURS_BEFORE);
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(0);

    world.setNow(new Date(SIX_HOURS_BEFORE.getTime() + LIMITS.reminderMinGuestAgeHours * 3600_000));
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(1);
  });

  it("does nothing while the event is more than a day away", async () => {
    await respond("going", "Omar", "omar@example.com");
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(0);
  });

  it("follows the event when its time is edited", async () => {
    await respond("going", "Omar", "omar@example.com");
    world.setNow(SIX_HOURS_BEFORE);
    const event = world.events.get("event-1");
    if (!event) throw new Error("missing event");
    // Moved a week later: no longer due.
    world.events.set("event-1", { ...event, startsAt: new Date(START.getTime() + 7 * 86_400_000) });
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(0);
    // Moved back to tomorrow: due again.
    world.events.set("event-1", {
      ...event,
      startsAt: new Date(SIX_HOURS_BEFORE.getTime() + 3600_000),
    });
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(1);
  });

  it.each([
    ["cancelled", { status: "cancelled" as const }],
    ["hidden after reports", { hiddenAt: new Date("2026-10-18T00:00:00Z") }],
    ["switched off by the host", { reminderEnabled: false }],
    ["already started", { startsAt: new Date("2026-10-20T09:00:00Z") }],
  ])("skips events that are %s", async (_label, patch) => {
    await respond("going", "Omar", "omar@example.com");
    world.events.set("event-1", makeEvent({ id: "event-1", startsAt: START, ...patch }));
    world.setNow(SIX_HOURS_BEFORE);
    await service.handleRemindersDue();
    expect(emailJobs(world)).toHaveLength(0);
  });
});

describe("nudge", () => {
  let world: FakeWorld;
  let events: ReturnType<typeof createEventService>;
  let notifications: ReturnType<typeof createNotificationService>;

  beforeEach(() => {
    world = createFakeWorld();
    events = createEventService(world.deps);
    notifications = createNotificationService(world.deps);
    world.events.set("event-1", makeEvent({ id: "event-1", hostId: "host-1", startsAt: START }));
  });

  const respond = (status: "going" | "maybe" | "not_going", name: string, email: string | null) =>
    world.deps.repos.rsvps.create({
      eventId: "event-1",
      status,
      name,
      email,
      editTokenHash: "hash",
    });

  it("only lets the host nudge", async () => {
    await expect(events.nudge("host-2", "event-1", ["a@example.com"])).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(world.jobs).toHaveLength(0);
  });

  it("stores the addresses, marks the event and queues one job", async () => {
    const result = await events.nudge("host-1", "event-1", ["mia@example.com"]);
    expect(result.recipients).toBe(1);
    expect(world.inviteeEmails.get("event-1")).toEqual(["mia@example.com"]);
    expect(world.events.get("event-1")?.nudgeSentAt).not.toBeNull();
    expect(world.jobs.map((job) => job.name)).toEqual(["guests.nudge"]);
  });

  it("allows one nudge per event", async () => {
    await events.nudge("host-1", "event-1", ["mia@example.com"]);
    await expect(events.nudge("host-1", "event-1", ["omar@example.com"])).rejects.toMatchObject({
      code: "limit_reached",
      params: { limit: "nudgesPerEvent" },
    });
    expect(world.jobs).toHaveLength(1);
  });

  it(`caps pasted addresses at ${LIMITS.inviteesPerEvent}`, async () => {
    const tooMany = Array.from(
      { length: LIMITS.inviteesPerEvent + 1 },
      (_, i) => `guest${i}@example.com`,
    );
    await expect(events.nudge("host-1", "event-1", tooMany)).rejects.toMatchObject({
      code: "limit_reached",
      params: { limit: "inviteesPerEvent" },
    });
    expect(world.events.get("event-1")?.nudgeSentAt).toBeNull();
  });

  it("refuses when there is nobody to remind, without using up the nudge", async () => {
    await respond("going", "Omar", "omar@example.com");
    await expect(events.nudge("host-1", "event-1", ["OMAR@example.com"])).rejects.toMatchObject({
      code: "validation",
    });
    expect(world.events.get("event-1")?.nudgeSentAt).toBeNull();
  });

  it("refuses cancelled and already started events", async () => {
    world.events.set(
      "event-2",
      makeEvent({ id: "event-2", hostId: "host-1", startsAt: START, status: "cancelled" }),
    );
    await expect(events.nudge("host-1", "event-2", ["a@example.com"])).rejects.toMatchObject({
      code: "event_cancelled",
    });
    world.setNow(new Date(START.getTime() + 60_000));
    await expect(events.nudge("host-1", "event-1", ["a@example.com"])).rejects.toMatchObject({
      code: "validation",
    });
  });

  it("emails maybe guests and invitees who haven't answered, once each", async () => {
    await respond("maybe", "Noor", "noor@example.com");
    await respond("going", "Omar", "omar@example.com");
    await respond("not_going", "Lina", null);
    await events.nudge("host-1", "event-1", [
      "mia@example.com",
      "noor@example.com",
      "OMAR@example.com",
    ]);

    await notifications.handleNudge({ eventId: "event-1" });

    expect(
      emailJobs(world)
        .map((email) => email.to)
        .sort(),
    ).toEqual(["mia@example.com", "noor@example.com"]);
    for (const email of emailJobs(world)) {
      expect(email.category).toBe("guest-update");
      expect(email.headers?.["List-Unsubscribe"]).toBeTruthy();
    }
    expect(world.activity.at(-1)).toMatchObject({ type: "nudge_sent", data: { recipients: 2 } });
  });

  it("stops nudging an invitee who responded after being added", async () => {
    await events.nudge("host-1", "event-1", ["mia@example.com", "omar@example.com"]);
    await respond("going", "Mia", "Mia@Example.com");
    await notifications.handleNudge({ eventId: "event-1" });
    expect(emailJobs(world).map((email) => email.to)).toEqual(["omar@example.com"]);
  });

  it("deletes the pasted addresses with the guests' contact details", async () => {
    await events.nudge("host-1", "event-1", ["mia@example.com"]);
    world.setNow(new Date(START.getTime() + (LIMITS.guestDataRetentionDays + 1) * 86_400_000));
    await notifications.handleGuestDataPurge();
    expect(world.inviteeEmails.has("event-1")).toBe(false);
  });
});

describe("nudge address list", () => {
  const eventId = "0198a1b2-0000-7000-8000-000000000001";

  it("accepts commas, spaces, new lines and Name <address> forms, lower-cased and unique", () => {
    const result = nudgeSchema.parse({
      eventId,
      invitees: "Mia@Example.com, omar@example.com;\nnoor@example.com  <mia@example.com> ",
    });
    expect(result.invitees).toEqual(["mia@example.com", "omar@example.com", "noor@example.com"]);
  });

  it("treats an empty box as no extra addresses", () => {
    expect(nudgeSchema.parse({ eventId }).invitees).toEqual([]);
  });

  it("rejects the whole list when one entry is not an address", () => {
    const result = nudgeSchema.safeParse({ eventId, invitees: "mia@example.com, not-an-email" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("eventDashboard.nudgeErrorEmails");
  });
});
