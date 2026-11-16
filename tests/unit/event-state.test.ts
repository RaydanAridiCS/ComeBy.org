import { describe, expect, it } from "vitest";
import { closedBy, eventState } from "@/features/events/state";
import { rsvpBlockReason } from "@/server/services/rsvp.service";

const NOW = new Date("2026-06-10T12:00:00Z");
const HOUR = 60 * 60 * 1000;

function event(overrides: Partial<Parameters<typeof eventState>[0]> = {}) {
  return {
    status: "active" as const,
    hiddenAt: null,
    rsvpClosed: false,
    rsvpDeadline: null,
    startsAt: new Date(NOW.getTime() + 48 * HOUR),
    endsAt: null,
    ...overrides,
  };
}

const past = { startsAt: new Date(NOW.getTime() - 48 * HOUR) };

describe("eventState", () => {
  it("is live for an upcoming event that takes answers", () => {
    expect(eventState(event(), NOW)).toBe("live");
  });

  it("is closed when the host closed RSVPs or the deadline passed", () => {
    expect(eventState(event({ rsvpClosed: true }), NOW)).toBe("closed");
    expect(eventState(event({ rsvpDeadline: new Date(NOW.getTime() - HOUR) }), NOW)).toBe("closed");
    expect(eventState(event({ rsvpDeadline: new Date(NOW.getTime() + HOUR) }), NOW)).toBe("live");
  });

  it("ends at the end time, or six hours after the start without one", () => {
    const startedFiveHoursAgo = new Date(NOW.getTime() - 5 * HOUR);
    expect(eventState(event({ startsAt: startedFiveHoursAgo }), NOW)).toBe("live");
    expect(eventState(event({ startsAt: new Date(NOW.getTime() - 6 * HOUR) }), NOW)).toBe("ended");
    expect(
      eventState(
        event({ startsAt: startedFiveHoursAgo, endsAt: new Date(NOW.getTime() - HOUR) }),
        NOW,
      ),
    ).toBe("ended");
  });

  it("orders hidden, then cancelled, then ended, then closed", () => {
    const everything = event({
      ...past,
      hiddenAt: NOW,
      status: "cancelled",
      rsvpClosed: true,
    });
    expect(eventState(everything, NOW)).toBe("hidden");
    expect(eventState({ ...everything, hiddenAt: null }, NOW)).toBe("cancelled");
    expect(eventState({ ...everything, hiddenAt: null, status: "active" }, NOW)).toBe("ended");
    expect(eventState(event({ rsvpClosed: true, status: "active" }), NOW)).toBe("closed");
  });

  it("says who closed a closed event, and nothing for other states", () => {
    expect(closedBy(event({ rsvpClosed: true }), NOW)).toBe("host");
    expect(closedBy(event({ rsvpDeadline: new Date(NOW.getTime() - HOUR) }), NOW)).toBe("deadline");
    expect(closedBy(event(), NOW)).toBeNull();
    expect(closedBy(event({ ...past, rsvpClosed: true }), NOW)).toBeNull();
  });

  it("is what the RSVP rules block on", () => {
    expect(rsvpBlockReason(event(), NOW)).toBeNull();
    expect(rsvpBlockReason(event({ status: "cancelled", ...past }), NOW)).toBe("cancelled");
    expect(rsvpBlockReason(event({ rsvpClosed: true }), NOW)).toBe("closed");
  });
});
