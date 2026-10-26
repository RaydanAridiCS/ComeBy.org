import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { events, type rsvps } from "@/db/schema";
import { createEvent, createHost, db, repos, resetDatabase } from "./support";

const DAY = 24 * 60 * 60 * 1000;

beforeEach(resetDatabase);

async function addRsvp(
  eventId: string,
  overrides: Partial<typeof rsvps.$inferInsert> = {},
): Promise<string> {
  const rsvp = await repos.rsvps.create({
    eventId,
    status: "going",
    name: "Omar",
    editTokenHash: "hash",
    ...overrides,
  });
  return rsvp.id;
}

describe("events repository", () => {
  it("counts only active, not-yet-ended events as upcoming", async () => {
    const host = await createHost();
    const now = new Date();
    await createEvent(host.id); // upcoming
    await createEvent(host.id, { status: "cancelled" });
    await createEvent(host.id, { startsAt: new Date(now.getTime() - 3 * DAY) }); // over
    // Started an hour ago with no end time: still within the default 6 hours.
    await createEvent(host.id, { startsAt: new Date(now.getTime() - 60 * 60 * 1000) });
    const other = await createHost();
    await createEvent(other.id);

    expect(await repos.events.countActiveByHost(host.id, now)).toBe(2);
  });

  it("counts events created since a date", async () => {
    const host = await createHost();
    await createEvent(host.id);
    await createEvent(host.id);
    const old = await createEvent(host.id);
    await db
      .update(events)
      .set({ createdAt: new Date(Date.now() - 40 * DAY) })
      .where(eq(events.id, old.id));

    expect(
      await repos.events.countCreatedByHostSince(host.id, new Date(Date.now() - 30 * DAY)),
    ).toBe(2);
  });

  it("keeps links unique", async () => {
    const host = await createHost();
    await createEvent(host.id, { slug: "picnic" });
    await expect(createEvent(host.id, { slug: "picnic" })).rejects.toThrow();
    expect(await repos.events.slugExists("picnic")).toBe(true);
    expect(await repos.events.findBySlug("picnic")).not.toBeNull();
  });

  it("counts reports correctly when they arrive at the same moment", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    await Promise.all(
      Array.from({ length: 10 }, () => repos.events.incrementReportCount(event.id)),
    );
    expect((await repos.events.findById(event.id))?.reportCount).toBe(10);
  });

  it("lists events whose guest data is due for deletion, once", async () => {
    const host = await createHost();
    const longOver = await createEvent(host.id, { startsAt: new Date(Date.now() - 120 * DAY) });
    await createEvent(host.id); // upcoming
    const alreadyPurged = await createEvent(host.id, {
      startsAt: new Date(Date.now() - 120 * DAY),
      guestDataPurgedAt: new Date(),
    });
    const cutoff = new Date(Date.now() - 90 * DAY);

    const due = await repos.events.listDueForGuestDataPurge(cutoff, 10);
    expect(due.map((event) => event.id)).toEqual([longOver.id]);
    expect(due.map((event) => event.id)).not.toContain(alreadyPurged.id);
  });

  it("summarises responses per event for the host list", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    await addRsvp(event.id, { status: "going", plusOnes: 2 });
    await addRsvp(event.id, { status: "going" });
    await addRsvp(event.id, { status: "maybe" });
    await addRsvp(event.id, { status: "not_going", plusOnes: 3 });

    const [listed] = await repos.events.listByHostWithStats(host.id);
    expect(listed?.stats).toEqual({ going: 2, maybe: 1, notGoing: 1, total: 4, guests: 4 });
  });

  it("blocks a second transaction from locking an event until the first finishes", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    const order: string[] = [];

    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = db.transaction(async (tx) => {
      await tx.select().from(events).where(eq(events.id, event.id)).for("update");
      order.push("first locked");
      await held;
      order.push("first done");
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const second = db.transaction(async (tx) => {
      await tx.select().from(events).where(eq(events.id, event.id)).for("update");
      order.push("second locked");
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(order).toEqual(["first locked"]);

    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first locked", "first done", "second locked"]);
  });
});

describe("rsvps repository", () => {
  it("removes phone numbers and emails but keeps names", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    const keep = await createEvent(host.id);
    await addRsvp(event.id, { phone: "+96170123456", email: "omar@example.com" });
    const keptId = await addRsvp(keep.id, { phone: "+96170999999", email: "sara@example.com" });

    await repos.rsvps.purgeContactDetails(event.id);

    expect(await repos.rsvps.listByEvent(event.id)).toMatchObject([
      { name: "Omar", phone: null, email: null },
    ]);
    expect(await repos.rsvps.findById(keptId)).toMatchObject({ email: "sara@example.com" });
  });

  it("lists only guests who left an email", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    await addRsvp(event.id, { name: "Omar", email: "omar@example.com" });
    await addRsvp(event.id, { name: "Nameless", email: null });

    expect((await repos.rsvps.listEmailRecipients(event.id)).map((r) => r.name)).toEqual(["Omar"]);
  });

  it("deletes responses and activity together with their event", async () => {
    const host = await createHost();
    const event = await createEvent(host.id);
    const rsvpId = await addRsvp(event.id);
    await repos.activity.add({ eventId: event.id, rsvpId, type: "rsvp_created" });

    await repos.events.delete(event.id);

    expect(await repos.rsvps.findById(rsvpId)).toBeNull();
    expect(await repos.activity.listByEvent(event.id, 10)).toEqual([]);
  });

  it("finds hosts with response activity in a period", async () => {
    const active = await createHost();
    const quiet = await createHost();
    const event = await createEvent(active.id);
    await createEvent(quiet.id);
    const rsvpId = await addRsvp(event.id);
    await repos.activity.add({ eventId: event.id, rsvpId, type: "rsvp_created" });

    expect(await repos.users.listIdsWithRsvpActivitySince(new Date(Date.now() - DAY))).toEqual([
      active.id,
    ]);
    expect(await repos.users.listIdsWithRsvpActivitySince(new Date(Date.now() + DAY))).toEqual([]);
  });
});

describe("rate limits repository", () => {
  const WINDOW = 60_000;

  it("counts hits within a window and starts over in the next one", async () => {
    const at = new Date("2026-10-26T10:00:10Z");
    expect(await repos.rateLimits.hit("k", WINDOW, at)).toBe(1);
    expect(await repos.rateLimits.hit("k", WINDOW, at)).toBe(2);
    expect(await repos.rateLimits.peek("k", WINDOW, at)).toBe(2);
    expect(await repos.rateLimits.hit("k", WINDOW, new Date("2026-10-26T10:01:10Z"))).toBe(1);
  });

  it("keeps keys apart and counts concurrent hits exactly", async () => {
    const at = new Date("2026-10-26T10:00:10Z");
    await Promise.all(Array.from({ length: 20 }, () => repos.rateLimits.hit("a", WINDOW, at)));
    await repos.rateLimits.hit("b", WINDOW, at);
    expect(await repos.rateLimits.peek("a", WINDOW, at)).toBe(20);
    expect(await repos.rateLimits.peek("b", WINDOW, at)).toBe(1);
    expect(await repos.rateLimits.peek("never", WINDOW, at)).toBe(0);
  });

  it("sweeps expired counters only", async () => {
    await repos.rateLimits.hit("old", WINDOW, new Date("2026-10-26T10:00:10Z"));
    await repos.rateLimits.hit("current", WINDOW, new Date("2026-10-26T10:05:10Z"));
    const removed = await repos.rateLimits.deleteExpired(new Date("2026-10-26T10:05:30Z"));
    expect(removed).toBe(1);
    expect(await repos.rateLimits.peek("current", WINDOW, new Date("2026-10-26T10:05:30Z"))).toBe(
      1,
    );
  });
});

describe("email suppressions repository", () => {
  it("remembers an address and why", async () => {
    expect(await repos.emailSuppressions.find("a@example.com")).toBeNull();
    await repos.emailSuppressions.add("a@example.com", "unsubscribed");
    expect(await repos.emailSuppressions.find("a@example.com")).toBe("unsubscribed");
  });

  it("upgrades an unsubscribe to a bounce, but never downgrades a bounce", async () => {
    await repos.emailSuppressions.add("a@example.com", "unsubscribed");
    await repos.emailSuppressions.add("a@example.com", "bounced");
    expect(await repos.emailSuppressions.find("a@example.com")).toBe("bounced");

    await repos.emailSuppressions.add("a@example.com", "unsubscribed");
    expect(await repos.emailSuppressions.find("a@example.com")).toBe("bounced");
    await repos.emailSuppressions.add("a@example.com", "complained");
    expect(await repos.emailSuppressions.find("a@example.com")).toBe("bounced");
  });
});

describe("user repositories", () => {
  it("finds a host by email and falls back to default settings", async () => {
    const host = await createHost({ email: "lina@example.com" });
    expect(await repos.users.findByEmail("lina@example.com")).toMatchObject({ id: host.id });
    expect(await repos.users.findByEmail("nobody@example.com")).toBeNull();
    expect(await repos.userSettings.get(host.id)).toMatchObject({
      emailAlerts: "instant",
      pushAlerts: true,
    });
  });

  it("saves settings changes without touching other fields", async () => {
    const host = await createHost();
    await repos.userSettings.upsert(host.id, { emailAlerts: "daily" });
    await repos.userSettings.upsert(host.id, { pushAlerts: false });
    expect(await repos.userSettings.get(host.id)).toMatchObject({
      emailAlerts: "daily",
      pushAlerts: false,
    });
  });
});

describe("admin repository", () => {
  it("queues hidden events first, then the most reported, with reasons and comments", async () => {
    const host = await createHost({ name: "Lina", email: "lina@example.com" });
    const quiet = await createEvent(host.id, { title: "Fine" });
    const some = await createEvent(host.id, { title: "Two reports", reportCount: 2 });
    const hidden = await createEvent(host.id, {
      title: "Hidden",
      reportCount: 3,
      hiddenAt: new Date(),
    });
    await repos.reports.create({
      eventId: hidden.id,
      reason: "scam",
      details: "Asks for money",
      reporterHash: "r1",
    });
    await repos.reports.create({ eventId: hidden.id, reason: "scam", reporterHash: "r2" });
    await repos.reports.create({ eventId: hidden.id, reason: "spam", reporterHash: "r3" });

    const queue = await repos.admin.listModerationQueue(10);

    expect(queue.map((item) => item.title)).toEqual(["Hidden", "Two reports"]);
    expect(queue.map((item) => item.id)).not.toContain(quiet.id);
    expect(queue[0]).toMatchObject({
      hostEmail: "lina@example.com",
      reasons: { scam: 2, spam: 1 },
      recentDetails: ["Asks for money"],
    });
    expect(queue[1]?.id).toBe(some.id);
  });

  it("restoring clears reports and shows the event again", async () => {
    const host = await createHost();
    const event = await createEvent(host.id, { reportCount: 3, hiddenAt: new Date() });
    await repos.reports.create({ eventId: event.id, reason: "spam", reporterHash: "r1" });

    await repos.admin.restoreEvent(event.id);

    expect(await repos.events.findById(event.id)).toMatchObject({ reportCount: 0, hiddenAt: null });
    expect(await repos.admin.listModerationQueue(10)).toEqual([]);
    // Reporters can report again afterwards.
    expect(
      await repos.reports.create({ eventId: event.id, reason: "spam", reporterHash: "r1" }),
    ).toBe(true);
  });

  it("keeps audit entries after the event and the admin are deleted", async () => {
    const admin = await createHost({ email: "ops@example.com" });
    const host = await createHost();
    const event = await createEvent(host.id, { title: "Scam", slug: "scam" });
    await repos.admin.addAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "delete_event",
      eventId: event.id,
      eventTitle: "Scam",
      eventSlug: "scam",
    });
    await repos.events.delete(event.id);
    await db.execute(
      // The admin's account goes away: the entry stays, with the email copy.
      (await import("drizzle-orm")).sql`DELETE FROM "user" WHERE id = ${admin.id}`,
    );

    expect(await repos.admin.listAudit(10)).toMatchObject([
      { adminId: null, adminEmail: "ops@example.com", eventTitle: "Scam", action: "delete_event" },
    ]);
  });
});
