import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { DAY_MS } from "@/server/services/deps";
import { createNotificationService } from "@/server/services/notification.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

type EmailJob = {
  to: string;
  subject: string;
  category: string;
  headers?: Record<string, string>;
  html: string;
};

const emailJobs = (world: FakeWorld) =>
  world.jobs.filter((job) => job.name === "email.send").map((job) => job.data as EmailJob);

describe("notification service", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createNotificationService>;

  beforeEach(() => {
    world = createFakeWorld();
    service = createNotificationService(world.deps);
    world.users.set("host-1", { id: "host-1", name: "Lina", email: "lina@example.com" });
    world.events.set("event-1", makeEvent({ id: "event-1", hostId: "host-1", title: "Picnic" }));
    world.settings.set("host-1", {
      userId: "host-1",
      emailAlerts: "instant",
      pushAlerts: false,
      createdAt: world.deps.now(),
      updatedAt: world.deps.now(),
    });
  });

  async function guestResponds(name: string, email: string | null = null) {
    const rsvp = await world.deps.repos.rsvps.create({
      eventId: "event-1",
      status: "going",
      name,
      email,
      editTokenHash: "hash",
    });
    await world.deps.repos.activity.add({
      eventId: "event-1",
      rsvpId: rsvp.id,
      type: "rsvp_created",
    });
    return rsvp;
  }

  describe("host alerts", () => {
    it("emails the host about a new response, with an unsubscribe link", async () => {
      const rsvp = await guestResponds("Omar");
      await service.handleRsvpAlert({ eventId: "event-1", rsvpId: rsvp.id, kind: "created" });

      const [email] = emailJobs(world);
      expect(email?.to).toBe("lina@example.com");
      expect(email?.subject).toContain("Omar");
      expect(email?.category).toBe("host-alert");
      expect(email?.headers?.["List-Unsubscribe"]).toContain("/api/unsubscribe?t=host.");
      expect(email?.html).toContain("/unsubscribe?t=host.");
    });

    it("sends nothing by email when the host chose daily summaries or no emails", async () => {
      const rsvp = await guestResponds("Omar");
      for (const emailAlerts of ["daily", "off"] as const) {
        await world.deps.repos.userSettings.upsert("host-1", { emailAlerts });
        await service.handleRsvpAlert({ eventId: "event-1", rsvpId: rsvp.id, kind: "created" });
      }
      expect(emailJobs(world)).toHaveLength(0);
    });

    it(`stops instant emails after ${LIMITS.instantAlertEmailsPerHostPerDay} a day`, async () => {
      const rsvp = await guestResponds("Omar");
      for (let i = 0; i < LIMITS.instantAlertEmailsPerHostPerDay + 5; i++) {
        await service.handleRsvpAlert({ eventId: "event-1", rsvpId: rsvp.id, kind: "created" });
      }
      expect(emailJobs(world)).toHaveLength(LIMITS.instantAlertEmailsPerHostPerDay);
    });

    it("does nothing when the event or response no longer exists", async () => {
      await service.handleRsvpAlert({ eventId: "gone", rsvpId: "gone", kind: "created" });
      expect(world.jobs).toHaveLength(0);
    });
  });

  describe("daily digest", () => {
    it("summarises the last day for hosts on daily mode", async () => {
      await world.deps.repos.userSettings.upsert("host-1", { emailAlerts: "daily" });
      await guestResponds("Omar");
      await guestResponds("Sara");
      await service.handleDailyDigest();

      const [email] = emailJobs(world);
      expect(email?.to).toBe("lina@example.com");
      expect(email?.category).toBe("host-alert");
      expect(email?.subject).toContain("2");
    });

    it("skips hosts who turned emails off, and hosts already getting instant emails", async () => {
      await guestResponds("Omar");
      await world.deps.repos.userSettings.upsert("host-1", { emailAlerts: "off" });
      await service.handleDailyDigest();
      await world.deps.repos.userSettings.upsert("host-1", { emailAlerts: "instant" });
      await service.handleDailyDigest();
      expect(emailJobs(world)).toHaveLength(0);
    });

    it("covers the rest of the day for hosts who used up their instant emails", async () => {
      const rsvp = await guestResponds("Omar");
      for (let i = 0; i < LIMITS.instantAlertEmailsPerHostPerDay + 1; i++) {
        await service.handleRsvpAlert({ eventId: "event-1", rsvpId: rsvp.id, kind: "created" });
      }
      world.jobs.length = 0;
      await service.handleDailyDigest();
      expect(emailJobs(world)).toHaveLength(1);
    });

    it("sends nothing when there was no activity", async () => {
      await world.deps.repos.userSettings.upsert("host-1", { emailAlerts: "daily" });
      await service.handleDailyDigest();
      expect(emailJobs(world)).toHaveLength(0);
    });
  });

  describe("guest update emails", () => {
    it("emails every guest who left an address, each with their own unsubscribe link", async () => {
      await guestResponds("Omar", "omar@example.com");
      await guestResponds("Sara", "sara@example.com");
      await guestResponds("Nameless");
      await service.handleEventUpdate({
        eventId: "event-1",
        kind: "updated",
        changes: ["time", "location"],
      });

      const emails = emailJobs(world);
      expect(emails.map((email) => email.to).sort()).toEqual([
        "omar@example.com",
        "sara@example.com",
      ]);
      for (const email of emails) {
        expect(email.category).toBe("guest-update");
        expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      }
      // Tokens are per address, so one guest's link can't unsubscribe another.
      expect(emails[0]?.headers?.["List-Unsubscribe"]).not.toBe(
        emails[1]?.headers?.["List-Unsubscribe"],
      );
    });

    it("sends a cancellation notice with the host's message", async () => {
      world.events.set(
        "event-1",
        makeEvent({
          id: "event-1",
          hostId: "host-1",
          title: "Picnic",
          cancelMessage: "Rain, sorry!",
        }),
      );
      await guestResponds("Omar", "omar@example.com");
      await service.handleEventUpdate({ eventId: "event-1", kind: "cancelled", changes: [] });

      const [email] = emailJobs(world);
      expect(email?.subject).toContain("Picnic");
      expect(email?.html).toContain("Rain, sorry!");
    });
  });

  describe("guest data purge", () => {
    it(`deletes contact details ${LIMITS.guestDataRetentionDays} days after the event`, async () => {
      world.events.set("old", makeEvent({ id: "old", startsAt: new Date("2026-06-01T10:00:00Z") }));
      await world.deps.repos.rsvps.create({
        eventId: "old",
        status: "going",
        name: "Omar",
        phone: "+96170123456",
        email: "omar@example.com",
        editTokenHash: "hash",
      });
      await service.handleGuestDataPurge();

      const [rsvp] = await world.deps.repos.rsvps.listByEvent("old");
      expect(rsvp).toMatchObject({ name: "Omar", phone: null, email: null });
      expect(world.events.get("old")?.guestDataPurgedAt).toEqual(world.deps.now());
    });

    it("keeps recent events' contact details and purges each event only once", async () => {
      world.events.set("recent", makeEvent({ id: "recent", startsAt: world.deps.now() }));
      await world.deps.repos.rsvps.create({
        eventId: "recent",
        status: "going",
        name: "Omar",
        email: "omar@example.com",
        editTokenHash: "hash",
      });
      await service.handleGuestDataPurge();
      expect((await world.deps.repos.rsvps.listByEvent("recent"))[0]?.email).toBe(
        "omar@example.com",
      );

      world.setNow(
        new Date(world.deps.now().getTime() + (LIMITS.guestDataRetentionDays + 1) * DAY_MS),
      );
      await service.handleGuestDataPurge();
      expect((await world.deps.repos.rsvps.listByEvent("recent"))[0]?.email).toBeNull();
    });
  });
});
