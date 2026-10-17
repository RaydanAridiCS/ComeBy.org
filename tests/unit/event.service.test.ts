import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { newEventDefaults } from "@/features/events/form-values";
import { type EventFormValues, eventFormSchema } from "@/features/events/schema";
import { AppError } from "@/server/errors";
import {
  createEventService,
  detectNotableChanges,
  formValuesToColumns,
} from "@/server/services/event.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

const values = (overrides: Partial<EventFormValues> = {}): EventFormValues =>
  eventFormSchema.parse({
    ...newEventDefaults("Lina"),
    title: "Picnic",
    startsAt: "2026-10-20T16:00",
    timezone: "UTC",
    ...overrides,
  });

describe("event service", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createEventService>;

  beforeEach(() => {
    world = createFakeWorld();
    service = createEventService(world.deps);
  });

  it("creates an event with an automatic link and logs it", async () => {
    const event = await service.create("host-1", values());
    expect(event.slug).toMatch(/^picnic-/);
    expect(event.startsAt.toISOString()).toBe("2026-10-20T16:00:00.000Z");
    expect(world.activity.map((a) => a.type)).toEqual(["event_created"]);
  });

  it("refuses a link that is already taken", async () => {
    await service.create("host-1", values({ slug: "picnic" }));
    await expect(service.create("host-2", values({ slug: "picnic" }))).rejects.toMatchObject({
      code: "slug_taken",
    });
  });

  it(`limits hosts to ${LIMITS.activeEventsPerHost} upcoming events`, async () => {
    for (let i = 0; i < LIMITS.activeEventsPerHost; i++) {
      world.events.set(`e${i}`, makeEvent({ id: `e${i}`, hostId: "host-1" }));
    }
    await expect(service.create("host-1", values())).rejects.toMatchObject({
      code: "limit_reached",
      params: { limit: "activeEventsPerHost" },
    });
  });

  it("does not count ended or cancelled events as upcoming", async () => {
    for (let i = 0; i < LIMITS.activeEventsPerHost; i++) {
      world.events.set(
        `e${i}`,
        makeEvent({
          id: `e${i}`,
          hostId: "host-1",
          status: i % 2 ? "cancelled" : "active",
          startsAt: new Date("2026-01-01T10:00:00Z"),
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }),
      );
    }
    await expect(service.create("host-1", values())).resolves.toBeTruthy();
  });

  it(`limits hosts to ${LIMITS.eventsPerHostPerMonth} new events per month`, async () => {
    for (let i = 0; i < LIMITS.eventsPerHostPerMonth; i++) {
      world.events.set(
        `m${i}`,
        makeEvent({
          id: `m${i}`,
          hostId: "host-1",
          status: "cancelled",
          createdAt: new Date("2026-10-05T00:00:00Z"),
        }),
      );
    }
    await expect(service.create("host-1", values())).rejects.toMatchObject({
      params: { limit: "eventsPerHostPerMonth" },
    });
  });

  it("only lets the owner edit an event", async () => {
    const event = await service.create("host-1", values());
    await expect(
      service.update("intruder", event.id, values(), { notifyGuests: true }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("emails guests about notable changes until the update-email limit", async () => {
    const event = await service.create("host-1", values());
    for (let i = 0; i < LIMITS.updateEmailsPerEvent + 1; i++) {
      const result = await service.update(
        "host-1",
        event.id,
        values({ startsAt: `2026-10-2${i}T10:00` }),
        {
          notifyGuests: true,
        },
      );
      expect(result.changes).toContain("time");
      expect(result.emailed).toBe(i < LIMITS.updateEmailsPerEvent);
    }
    expect(world.jobs.filter((job) => job.name === "guests.event-update")).toHaveLength(
      LIMITS.updateEmailsPerEvent,
    );
  });

  it("does not email guests when nothing they care about changed", async () => {
    const event = await service.create("host-1", values());
    const result = await service.update("host-1", event.id, values({ theme: "midnight" }), {
      notifyGuests: true,
    });
    expect(result.changes).toEqual([]);
    expect(result.emailed).toBe(false);
  });

  it("cancels an event and closes RSVPs", async () => {
    const event = await service.create("host-1", values());
    const cancelled = await service.cancel("host-1", event.id, "Rain!");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.rsvpClosed).toBe(true);
    expect(world.jobs.some((job) => job.name === "guests.event-update")).toBe(true);
  });
});

describe("detectNotableChanges", () => {
  it("spots time and place changes", () => {
    const before = makeEvent({ startsAt: new Date("2026-10-20T16:00:00Z"), timezone: "UTC" });
    const after = formValuesToColumns(
      values({ startsAt: "2026-10-21T16:00", locationName: "Beach", title: before.title }),
    );
    expect(detectNotableChanges(before, after)).toEqual(["time", "location"]);
  });
});
