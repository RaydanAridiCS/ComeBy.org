import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/config/limits";
import { isAdmin } from "@/server/auth/admin-policy";
import { createAdminService } from "@/server/services/admin.service";
import { createNotificationService } from "@/server/services/notification.service";
import { createReportService } from "@/server/services/report.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

// `env` is read once at import time, so tests swap the whole module to change ADMIN_EMAILS.
const mockEnv = vi.hoisted(() => ({
  ADMIN_EMAILS: "ops@example.com, boss@example.com" as string | undefined,
  NEXT_PUBLIC_APP_URL: "https://comeby.test",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
  LOG_LEVEL: "silent",
}));
vi.mock("@/env", () => ({ env: mockEnv }));

const allowlist = ["ops@example.com", "boss@example.com"];

describe("isAdmin", () => {
  it("allows verified users on the allowlist, ignoring letter case and spaces", () => {
    expect(isAdmin({ email: "Ops@Example.com ", emailVerified: true }, allowlist)).toBe(true);
  });

  it("refuses unverified addresses, even when listed", () => {
    expect(isAdmin({ email: "ops@example.com", emailVerified: false }, allowlist)).toBe(false);
  });

  it("refuses everyone else, signed-out visitors and an empty allowlist", () => {
    expect(isAdmin({ email: "lina@example.com", emailVerified: true }, allowlist)).toBe(false);
    expect(isAdmin(null, allowlist)).toBe(false);
    expect(isAdmin({ email: "ops@example.com", emailVerified: true }, [])).toBe(false);
  });
});

describe("admin service", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createAdminService>;
  const admin = { id: "admin-1", email: "ops@example.com" };

  beforeEach(() => {
    world = createFakeWorld();
    service = createAdminService(world.deps);
    world.users.set("host-1", { id: "host-1", name: "Lina", email: "lina@example.com" });
    world.events.set(
      "e1",
      makeEvent({
        id: "e1",
        slug: "scam-party",
        title: "Free money",
        hostId: "host-1",
        reportCount: 3,
        hiddenAt: new Date("2026-10-17T11:00:00Z"),
        coverImageKey: "covers/e1.webp",
      }),
    );
    world.events.set("fine", makeEvent({ id: "fine", hostId: "host-1" }));
  });

  it("lists only reported or hidden events", async () => {
    const queue = await service.queue();
    expect(queue.map((item) => item.id)).toEqual(["e1"]);
    expect(queue[0]).toMatchObject({ hostEmail: "lina@example.com", reportCount: 3 });
  });

  it("restores an event: clears reports, shows it again and writes an audit entry", async () => {
    world.reportRows.push({ eventId: "e1" }, { eventId: "e1" }, { eventId: "other" });
    await service.restore(admin, "e1");

    expect(world.events.get("e1")).toMatchObject({ hiddenAt: null, reportCount: 0 });
    expect(world.reportRows).toEqual([{ eventId: "other" }]);
    expect(await service.queue()).toHaveLength(0);
    expect(await service.recentActions()).toMatchObject([
      { action: "restore_event", adminEmail: "ops@example.com", eventTitle: "Free money" },
    ]);
  });

  it("deletes an event, returns its cover key and keeps the audit entry", async () => {
    const result = await service.remove(admin, "e1");

    expect(result).toEqual({ slug: "scam-party", coverImageKey: "covers/e1.webp" });
    expect(world.events.has("e1")).toBe(false);
    const [entry] = await service.recentActions();
    expect(entry).toMatchObject({
      action: "delete_event",
      eventId: "e1",
      eventTitle: "Free money",
      eventSlug: "scam-party",
    });
  });

  it("refuses to act on an event that doesn't exist", async () => {
    await expect(service.restore(admin, "missing")).rejects.toMatchObject({ code: "not_found" });
    await expect(service.remove(admin, "missing")).rejects.toMatchObject({ code: "not_found" });
    expect(await service.recentActions()).toHaveLength(0);
  });
});

describe("auto-hide alerts", () => {
  let world: FakeWorld;

  beforeEach(() => {
    world = createFakeWorld();
    world.events.set("e1", makeEvent({ id: "e1", title: "Free money" }));
  });

  it("queues an admin alert when the report threshold hides an event", async () => {
    const reports = createReportService(world.deps);
    for (let i = 0; i < LIMITS.reportsBeforeAutoHide; i++) {
      await reports.report({ eventId: "e1", reason: "scam", details: "", reporterHash: `r${i}` });
    }
    expect(world.events.get("e1")?.hiddenAt).not.toBeNull();
    expect(world.jobs.filter((job) => job.name === "moderation.event-hidden")).toEqual([
      { name: "moderation.event-hidden", data: { eventId: "e1" } },
    ]);
  });

  it("does not alert again for reports after the event is already hidden", async () => {
    const reports = createReportService(world.deps);
    for (let i = 0; i < LIMITS.reportsBeforeAutoHide + 3; i++) {
      await reports.report({ eventId: "e1", reason: "spam", details: "", reporterHash: `r${i}` });
    }
    expect(world.jobs.filter((job) => job.name === "moderation.event-hidden")).toHaveLength(1);
  });

  it("emails every admin when the alert job runs", async () => {
    world.events.set("e1", makeEvent({ id: "e1", title: "Free money", hiddenAt: new Date() }));
    await createNotificationService(world.deps).handleEventHidden({ eventId: "e1" });
    const recipients = world.jobs
      .filter((job) => job.name === "email.send")
      .map((job) => (job.data as { to: string }).to);
    expect(recipients).toEqual(["ops@example.com", "boss@example.com"]);
  });

  it("sends nothing when the event was restored before the alert ran", async () => {
    await createNotificationService(world.deps).handleEventHidden({ eventId: "e1" });
    expect(world.jobs).toHaveLength(0);
  });

  it("sends nothing when no admins are configured", async () => {
    mockEnv.ADMIN_EMAILS = undefined;
    try {
      world.events.set("e1", makeEvent({ id: "e1", hiddenAt: new Date() }));
      await createNotificationService(world.deps).handleEventHidden({ eventId: "e1" });
      expect(world.jobs).toHaveLength(0);
    } finally {
      mockEnv.ADMIN_EMAILS = "ops@example.com, boss@example.com";
    }
  });
});
