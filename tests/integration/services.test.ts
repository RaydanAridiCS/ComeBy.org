import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { rsvpFormSchema } from "@/features/rsvp/schema";
import { createAdminService } from "@/server/services/admin.service";
import { createEventService } from "@/server/services/event.service";
import { createNotificationService } from "@/server/services/notification.service";
import { createReportService } from "@/server/services/report.service";
import { createRsvpService } from "@/server/services/rsvp.service";
import { createSuppressionService } from "@/server/services/suppression.service";
import {
  createEvent,
  createHost,
  createIntegrationDeps,
  eventFormValues,
  repos,
  resetDatabase,
} from "./support";

beforeEach(resetDatabase);

const guest = (overrides: Record<string, unknown> = {}) =>
  rsvpFormSchema.parse({ status: "going", name: "Omar", ...overrides });

async function seedRsvps(eventId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await repos.rsvps.create({ eventId, status: "going", name: `Guest ${i}`, editTokenHash: "h" });
  }
}

describe("RSVP service on a real database", () => {
  it("never lets concurrent guests exceed the response cap", async () => {
    const { deps } = createIntegrationDeps();
    const service = createRsvpService(deps);
    const host = await createHost();
    const event = await createEvent(host.id);
    await seedRsvps(event.id, LIMITS.responsesPerEvent - 3);

    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        service.submit({
          eventId: event.id,
          values: guest({ name: `Racer ${i}` }),
          credential: null,
          deviceKey: `device-${i}`,
        }),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(9);
    for (const result of rejected) {
      expect(result).toMatchObject({ reason: { code: "limit_reached" } });
    }
    expect(await repos.rsvps.countByEvent(event.id)).toBe(LIMITS.responsesPerEvent);
  });

  it("lets a guest edit their response with their credential, without using up a spot", async () => {
    const { deps } = createIntegrationDeps();
    const service = createRsvpService(deps);
    const host = await createHost();
    const event = await createEvent(host.id);

    const first = await service.submit({
      eventId: event.id,
      values: guest({ status: "maybe" }),
      credential: null,
      deviceKey: "d1",
    });
    const second = await service.submit({
      eventId: event.id,
      values: guest({ status: "going" }),
      credential: first.credential,
      deviceKey: "d1",
    });

    expect(second.created).toBe(false);
    expect(second.rsvp.id).toBe(first.rsvp.id);
    expect(await repos.rsvps.countByEvent(event.id)).toBe(1);
    expect((await repos.activity.listByEvent(event.id, 10)).map((a) => a.type).sort()).toEqual([
      "rsvp_created",
      "rsvp_updated",
    ]);
  });

  it("limits one device's responses per hour using the shared counters", async () => {
    const { deps } = createIntegrationDeps();
    const service = createRsvpService(deps);
    const host = await createHost();
    const event = await createEvent(host.id);

    const attempts = LIMITS.responsesPerDevicePerEventPerHour + 2;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        service.submit({ eventId: event.id, values: guest(), credential: null, deviceKey: "same" }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(
      LIMITS.responsesPerDevicePerEventPerHour,
    );
  });

  it("deletes a guest's own response and leaves no trace of the guest in the database", async () => {
    const { deps } = createIntegrationDeps();
    const service = createRsvpService(deps);
    const host = await createHost();
    const event = await createEvent(host.id);

    const first = await service.submit({
      eventId: event.id,
      values: guest({ name: "Secret Guest", email: "secret@example.com", message: "hi" }),
      credential: null,
      deviceKey: "d1",
    });
    await service.submit({
      eventId: event.id,
      values: guest({ name: "Secret Guest", status: "maybe", email: "secret@example.com" }),
      credential: first.credential,
      deviceKey: "d1",
    });
    const other = await service.submit({
      eventId: event.id,
      values: guest({ name: "Other Guest" }),
      credential: null,
      deviceKey: "d2",
    });

    const { email } = await service.deleteByGuest({
      eventId: event.id,
      credential: first.credential,
    });

    expect(email).toBe("secret@example.com");
    expect(await repos.rsvps.findById(first.rsvp.id)).toBeNull();
    expect(await service.findByCredential(event.id, first.credential)).toBeNull();
    const dashboard = await service.dashboardData(host.id, event.id);
    expect(dashboard.responses.map((r) => r.name)).toEqual(["Other Guest"]);
    expect(dashboard.stats.total).toBe(1);
    const timeline = JSON.stringify(await repos.activity.listByEvent(event.id, 20));
    expect(timeline).not.toContain("Secret Guest");
    expect(timeline).not.toContain("secret@example.com");
    expect(timeline).toContain("Other Guest");
    // The other guest keeps their own link.
    expect(await service.findByCredential(event.id, other.credential)).not.toBeNull();
  });
});

describe("event service on a real database", () => {
  it("creates, limits and deletes events, with the audit trail intact", async () => {
    const { deps } = createIntegrationDeps();
    const service = createEventService(deps);
    const host = await createHost();

    const event = await service.create(host.id, eventFormValues({ slug: "real-db-picnic" }));
    expect(await repos.events.findBySlug("real-db-picnic")).toMatchObject({ id: event.id });
    expect((await repos.activity.listByEvent(event.id, 10)).map((a) => a.type)).toEqual([
      "event_created",
    ]);
    expect((await service.usage(host.id)).active).toBe(1);

    await service.delete(host.id, event.id);
    expect(await repos.events.findById(event.id)).toBeNull();
  });

  it("rate-limits creating events per host, separately for each host", async () => {
    const { deps } = createIntegrationDeps();
    const service = createEventService(deps);
    const host = await createHost();
    const other = await createHost();

    for (let i = 0; i < LIMITS.eventCreationsPerHostPerHour; i++) {
      await service.create(host.id, eventFormValues({ slug: `burst-${i}` }));
    }
    await expect(
      service.create(host.id, eventFormValues({ slug: "burst-x" })),
    ).rejects.toMatchObject({ code: "rate_limited" });
    await expect(
      service.create(other.id, eventFormValues({ slug: "other-host" })),
    ).resolves.toBeTruthy();
  });
});

describe("moderation on a real database", () => {
  it("hides an event after enough reports, then an admin restores it", async () => {
    const { deps, jobs } = createIntegrationDeps();
    const reports = createReportService(deps);
    const admin = createAdminService(deps);
    const host = await createHost();
    const event = await createEvent(host.id, { title: "Free money" });

    for (let i = 0; i < LIMITS.reportsBeforeAutoHide; i++) {
      await reports.report({
        eventId: event.id,
        reason: "scam",
        details: "Asks for payment",
        reporterHash: `reporter-${i}`,
      });
    }
    expect((await repos.events.findById(event.id))?.hiddenAt).not.toBeNull();
    expect(jobs.filter((job) => job.name === "moderation.event-hidden")).toHaveLength(1);
    expect(await admin.queue()).toMatchObject([
      { id: event.id, reportCount: LIMITS.reportsBeforeAutoHide, reasons: { scam: 3 } },
    ]);

    await admin.restore({ id: host.id, email: host.email }, event.id);
    expect(await repos.events.findById(event.id)).toMatchObject({ hiddenAt: null, reportCount: 0 });
    expect(await admin.recentActions()).toMatchObject([{ action: "restore_event" }]);
  });

  it("counts a reporter only once per event", async () => {
    const { deps } = createIntegrationDeps();
    const reports = createReportService(deps);
    const host = await createHost();
    const event = await createEvent(host.id);

    for (let i = 0; i < 4; i++) {
      await reports.report({
        eventId: event.id,
        reason: "spam",
        details: "",
        reporterHash: "same",
      });
    }
    expect((await repos.events.findById(event.id))?.reportCount).toBe(1);
  });
});

describe("notifications on a real database", () => {
  it("sends an unsubscribe-ready update email to each guest and purges old contact details", async () => {
    const { deps, jobs } = createIntegrationDeps();
    const notifications = createNotificationService(deps);
    const host = await createHost();
    const event = await createEvent(host.id, {
      startsAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    });
    await repos.rsvps.create({
      eventId: event.id,
      status: "going",
      name: "Omar",
      email: "omar@example.com",
      editTokenHash: "h",
    });

    await notifications.handleEventUpdate({
      eventId: event.id,
      kind: "updated",
      changes: ["time"],
    });
    const email = jobs.find((job) => job.name === "email.send")?.data as {
      to: string;
      category: string;
    };
    expect(email).toMatchObject({ to: "omar@example.com", category: "guest-update" });

    await notifications.handleGuestDataPurge();
    expect((await repos.rsvps.listByEvent(event.id))[0]).toMatchObject({ email: null });
    expect((await repos.events.findById(event.id))?.guestDataPurgedAt).not.toBeNull();
  });

  it("stops guest emails after they unsubscribe and bounces block everything", async () => {
    const { deps } = createIntegrationDeps();
    const suppression = createSuppressionService(deps);

    await suppression.unsubscribe("guest", "Omar@Example.com");
    expect(await suppression.canSend("omar@example.com", "guest-update")).toBe(false);
    expect(await suppression.canSend("omar@example.com", "transactional")).toBe(true);

    await suppression.suppress("omar@example.com", "bounced");
    expect(await suppression.canSend("omar@example.com", "transactional")).toBe(false);
  });

  it("turns a host's alerts off from their unsubscribe link", async () => {
    const { deps } = createIntegrationDeps();
    const suppression = createSuppressionService(deps);
    const host = await createHost({ email: "lina@example.com" });

    await suppression.unsubscribe("host", "lina@example.com");
    expect((await repos.userSettings.get(host.id)).emailAlerts).toBe("off");
  });
});
