import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { events, rsvps } from "@/db/schema";
import type { JobPayloads } from "@/server/jobs/types";
import { createEventService } from "@/server/services/event.service";
import { createNotificationService } from "@/server/services/notification.service";
import {
  createEvent,
  createHost,
  createIntegrationDeps,
  db,
  repos,
  resetDatabase,
} from "./support";

const HOUR = 60 * 60 * 1000;

beforeEach(resetDatabase);

async function addRsvp(
  eventId: string,
  overrides: Partial<typeof rsvps.$inferInsert> = {},
): Promise<string> {
  const rsvp = await repos.rsvps.create({
    eventId,
    status: "going",
    name: "Omar",
    email: "omar@example.com",
    editTokenHash: "hash",
    ...overrides,
  });
  // Pretend the guest answered a day ago, so the "just responded" grace period has passed.
  await db
    .update(rsvps)
    .set({ createdAt: new Date(Date.now() - 24 * HOUR) })
    .where(eq(rsvps.id, rsvp.id));
  return rsvp.id;
}

describe("reminder queries", () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * HOUR);
  const respondedBefore = new Date(now.getTime() - 2 * HOUR);

  const due = async () =>
    (await repos.events.listDueForReminder(now, windowEnd, respondedBefore, 50)).map((e) => e.id);

  it("lists only active, visible events inside the window that still owe a guest a reminder", async () => {
    const host = await createHost();
    const soon = await createEvent(host.id, { startsAt: new Date(now.getTime() + 6 * HOUR) });
    await addRsvp(soon.id);

    const farAway = await createEvent(host.id, {
      startsAt: new Date(now.getTime() + 3 * 24 * HOUR),
    });
    await addRsvp(farAway.id);
    const started = await createEvent(host.id, { startsAt: new Date(now.getTime() - HOUR) });
    await addRsvp(started.id);
    const cancelled = await createEvent(host.id, {
      startsAt: new Date(now.getTime() + 6 * HOUR),
      status: "cancelled",
    });
    await addRsvp(cancelled.id);
    const hidden = await createEvent(host.id, {
      startsAt: new Date(now.getTime() + 6 * HOUR),
      hiddenAt: now,
    });
    await addRsvp(hidden.id);
    const off = await createEvent(host.id, {
      startsAt: new Date(now.getTime() + 6 * HOUR),
      reminderEnabled: false,
    });
    await addRsvp(off.id);
    const nobodyOwed = await createEvent(host.id, {
      startsAt: new Date(now.getTime() + 6 * HOUR),
    });
    await addRsvp(nobodyOwed.id, { status: "not_going" });

    expect(await due()).toEqual([soon.id]);
  });

  it("hands each guest out exactly once, even when two sweeps race", async () => {
    const host = await createHost();
    const event = await createEvent(host.id, { startsAt: new Date(now.getTime() + 6 * HOUR) });
    await addRsvp(event.id, { email: "a@example.com", name: "A" });
    await addRsvp(event.id, { email: "b@example.com", name: "B", status: "maybe" });
    await addRsvp(event.id, { email: "c@example.com", name: "C", status: "not_going" });
    await addRsvp(event.id, { email: null, name: "D" });

    const claims = await Promise.all(
      Array.from({ length: 5 }, () =>
        repos.rsvps.claimReminderRecipients(event.id, now, respondedBefore),
      ),
    );

    const claimed = claims.flat().map((guest) => guest.email);
    expect(claimed.sort()).toEqual(["a@example.com", "b@example.com"]);
    expect(await due()).toEqual([]);
  });

  it("leaves out guests who responded too recently", async () => {
    const host = await createHost();
    const event = await createEvent(host.id, { startsAt: new Date(now.getTime() + 6 * HOUR) });
    const fresh = await repos.rsvps.create({
      eventId: event.id,
      status: "going",
      name: "New",
      email: "new@example.com",
      editTokenHash: "hash",
    });
    expect(await due()).toEqual([]);
    expect(await repos.rsvps.claimReminderRecipients(event.id, now, respondedBefore)).toEqual([]);
    expect((await repos.rsvps.findById(fresh.id))?.reminderSentAt).toBeNull();
  });
});

describe("nudge on a real database", () => {
  it("lets exactly one of several simultaneous nudges through", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    const { deps, jobs } = createIntegrationDeps();
    const service = createEventService(deps);

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => service.nudge(host.id, event.id, ["mia@example.com"])),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(jobs.filter((job) => job.name === "guests.nudge")).toHaveLength(1);
    expect(await repos.invitees.listEmails(event.id)).toEqual(["mia@example.com"]);
  });

  it("keeps each address once per event and compares case-insensitively", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    await repos.invitees.addMany(event.id, ["Mia@Example.com", "mia@example.com"]);
    expect(await repos.invitees.listEmails(event.id)).toEqual(["mia@example.com"]);
  });

  it("emails the right people and records the nudge", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    await addRsvp(event.id, { status: "maybe", name: "Noor", email: "noor@example.com" });
    await addRsvp(event.id, { status: "going", email: "omar@example.com" });
    const { deps, jobs } = createIntegrationDeps();
    await createEventService(deps).nudge(host.id, event.id, [
      "mia@example.com",
      "OMAR@example.com",
    ]);

    await createNotificationService(deps).handleNudge(
      jobs.find((job) => job.name === "guests.nudge")?.data as JobPayloads["guests.nudge"],
    );

    const sentTo = jobs
      .filter((job) => job.name === "email.send")
      .map((job) => (job.data as JobPayloads["email.send"]).to)
      .sort();
    expect(sentTo).toEqual(["mia@example.com", "noor@example.com"]);
    expect((await repos.events.findById(event.id))?.nudgeSentAt).not.toBeNull();
    const activity = await repos.activity.listByEvent(event.id, 10);
    expect(activity.find((item) => item.type === "nudge_sent")?.data).toEqual({ recipients: 2 });
  });

  it("is deleted with the event and with the guest data purge", async () => {
    const host = await createHost();
    const purged = await createEvent(host.id, { startsAt: new Date(Date.now() - 120 * 24 * HOUR) });
    const kept = await createEvent(host.id);
    await repos.invitees.addMany(purged.id, ["a@example.com"]);
    await repos.invitees.addMany(kept.id, ["b@example.com"]);

    const { deps } = createIntegrationDeps();
    await createNotificationService(deps).handleGuestDataPurge();

    expect(await repos.invitees.listEmails(purged.id)).toEqual([]);
    expect(await repos.invitees.listEmails(kept.id)).toEqual(["b@example.com"]);

    await db.delete(events).where(eq(events.id, kept.id));
    expect(await repos.invitees.listEmails(kept.id)).toEqual([]);
  });
});
