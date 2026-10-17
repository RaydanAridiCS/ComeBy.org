import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { type RsvpFormValues, rsvpFormSchema } from "@/features/rsvp/schema";
import {
  applyEventRules,
  createRsvpService,
  rsvpBlockReason,
} from "@/server/services/rsvp.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

const answer = (overrides: Partial<RsvpFormValues> = {}): RsvpFormValues =>
  rsvpFormSchema.parse({ status: "going", name: "Omar", ...overrides });

describe("RSVP rules", () => {
  it("requires a phone number when the host asks for one", () => {
    const event = makeEvent({ phoneMode: "required" });
    expect(() => applyEventRules(event, answer())).toThrowError();
    expect(applyEventRules(event, answer({ phone: "+14155550123" })).phone).toBe("+14155550123");
  });

  it("rejects invalid phone numbers", () => {
    expect(() => applyEventRules(makeEvent(), answer({ phone: "+1 123" }))).toThrowError();
  });

  it("drops fields the host turned off", () => {
    const event = makeEvent({ phoneMode: "hidden", allowMessage: false });
    const result = applyEventRules(event, answer({ phone: "+14155550123", message: "Hi" }));
    expect(result.phone).toBe("");
    expect(result.message).toBe("");
  });

  it("caps +1s at the host's maximum and only for guests who are going", () => {
    const event = makeEvent({ allowPlusOnes: true, maxPlusOnes: 2 });
    expect(applyEventRules(event, answer({ plusOnes: 5 })).plusOnes).toBe(2);
    expect(applyEventRules(event, answer({ status: "maybe", plusOnes: 2 })).plusOnes).toBe(0);
  });

  it("checks required questions and valid choices", () => {
    const event = makeEvent({
      customQuestions: [
        { id: "day", label: "Day?", type: "choice", required: true, choices: ["Sat", "Sun"] },
      ],
    });
    expect(() => applyEventRules(event, answer())).toThrowError();
    expect(() => applyEventRules(event, answer({ answers: { day: "Mon" } }))).toThrowError();
    expect(applyEventRules(event, answer({ answers: { day: "Sun" } })).answers).toEqual({
      day: "Sun",
    });
    // Guests who can't come don't have to answer.
    expect(() => applyEventRules(event, answer({ status: "not_going" }))).not.toThrow();
  });

  it("knows when an event stops accepting responses", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(rsvpBlockReason(makeEvent(), now)).toBeNull();
    expect(rsvpBlockReason(makeEvent({ rsvpClosed: true }), now)).toBe("closed");
    expect(
      rsvpBlockReason(makeEvent({ rsvpDeadline: new Date("2026-10-17T11:00:00Z") }), now),
    ).toBe("closed");
    expect(rsvpBlockReason(makeEvent({ status: "cancelled" }), now)).toBe("cancelled");
    expect(rsvpBlockReason(makeEvent({ startsAt: new Date("2026-10-01T10:00:00Z") }), now)).toBe(
      "ended",
    );
  });
});

describe("RSVP service", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createRsvpService>;

  beforeEach(() => {
    world = createFakeWorld();
    service = createRsvpService(world.deps);
  });

  it("creates a response, logs it and alerts the host", async () => {
    const event = makeEvent();
    world.events.set(event.id, event);
    const result = await service.submit({
      eventId: event.id,
      values: answer(),
      credential: null,
      deviceKey: "device-1",
    });
    expect(result.created).toBe(true);
    expect(world.activity.map((a) => a.type)).toEqual(["rsvp_created"]);
    expect(world.jobs.map((j) => j.name)).toEqual(["host.rsvp-alert"]);
  });

  it("updates the same response when the guest comes back with their credential", async () => {
    const event = makeEvent();
    world.events.set(event.id, event);
    const first = await service.submit({
      eventId: event.id,
      values: answer(),
      credential: null,
      deviceKey: "d",
    });
    const second = await service.submit({
      eventId: event.id,
      values: answer({ status: "not_going" }),
      credential: first.credential,
      deviceKey: "d",
    });
    expect(second.created).toBe(false);
    expect(world.rsvps.size).toBe(1);
    expect(world.activity.at(-1)?.data).toMatchObject({ from: "going", to: "not_going" });
  });

  it("ignores a forged credential and creates a new response instead", async () => {
    const event = makeEvent();
    world.events.set(event.id, event);
    const first = await service.submit({
      eventId: event.id,
      values: answer(),
      credential: null,
      deviceKey: "a",
    });
    const forged = { rsvpId: first.rsvp.id, token: "not-the-secret" };
    const second = await service.submit({
      eventId: event.id,
      values: answer(),
      credential: forged,
      deviceKey: "b",
    });
    expect(second.created).toBe(true);
    expect(world.rsvps.size).toBe(2);
  });

  it(`stops at ${LIMITS.responsesPerEvent} responses per event`, async () => {
    const event = makeEvent();
    world.events.set(event.id, event);
    for (let i = 0; i < LIMITS.responsesPerEvent; i++) {
      await world.deps.repos.rsvps.create({
        eventId: event.id,
        status: "going",
        name: `G${i}`,
        editTokenHash: "x",
      });
    }
    await expect(
      service.submit({ eventId: event.id, values: answer(), credential: null, deviceKey: "z" }),
    ).rejects.toMatchObject({ params: { limit: "responsesPerEvent" } });
  });

  it(`rate-limits a device to ${LIMITS.responsesPerDevicePerEventPerHour} responses per hour`, async () => {
    const event = makeEvent();
    world.events.set(event.id, event);
    for (let i = 0; i < LIMITS.responsesPerDevicePerEventPerHour; i++) {
      await service.submit({
        eventId: event.id,
        values: answer(),
        credential: null,
        deviceKey: "spam",
      });
    }
    await expect(
      service.submit({ eventId: event.id, values: answer(), credential: null, deviceKey: "spam" }),
    ).rejects.toMatchObject({ params: { limit: "responsesPerDevicePerEventPerHour" } });
  });

  it("refuses responses to cancelled or closed events", async () => {
    const cancelled = makeEvent({ status: "cancelled" });
    const closed = makeEvent({ rsvpClosed: true });
    world.events.set(cancelled.id, cancelled);
    world.events.set(closed.id, closed);
    await expect(
      service.submit({ eventId: cancelled.id, values: answer(), credential: null, deviceKey: "d" }),
    ).rejects.toMatchObject({ code: "event_cancelled" });
    await expect(
      service.submit({ eventId: closed.id, values: answer(), credential: null, deviceKey: "d" }),
    ).rejects.toMatchObject({ code: "rsvp_closed" });
  });

  it("follows the host's guest-list visibility", async () => {
    const hidden = makeEvent({ guestListVisibility: "hidden" });
    const names = makeEvent({ guestListVisibility: "names" });
    world.events.set(hidden.id, hidden);
    world.events.set(names.id, names);
    await service.submit({ eventId: names.id, values: answer(), credential: null, deviceKey: "d" });
    expect(await service.publicGuestList(hidden)).toBeNull();
    expect(await service.publicGuestList(names)).toMatchObject({ going: 1, names: ["Omar"] });
  });
});
