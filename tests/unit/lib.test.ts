import { describe, expect, it } from "vitest";
import { buildIcsFile, googleCalendarUrl } from "@/lib/calendar";
import {
  dateToZonedInput,
  formatEventWhen,
  isValidTimeZone,
  startOfUtcMonth,
  zonedInputToDate,
} from "@/lib/dates";
import { generateSlug, slugify, validateSlug } from "@/lib/slug";

describe("slugs", () => {
  it("turns titles into URL-friendly slugs", () => {
    expect(slugify("Lina's 20th B-Day! 🎉")).toBe("linas-20th-b-day");
    expect(slugify("  Café   Picnic  ")).toBe("cafe-picnic");
  });

  it("rejects reserved, short and malformed slugs", () => {
    expect(validateSlug("dashboard")).toBe("reserved");
    expect(validateSlug("ab")).toBe("too_short");
    expect(validateSlug("-bad-")).toBe("invalid_characters");
    expect(validateSlug("Upper")).toBe("invalid_characters");
    expect(validateSlug("linas-bday")).toBeNull();
  });

  it("generates unique-looking slugs from titles", () => {
    expect(generateSlug("Game night")).toMatch(/^game-night-[a-z2-9]{5}$/);
    expect(generateSlug("🎉🎉")).toMatch(/^event-[a-z2-9]{5}$/);
  });
});

describe("time zones", () => {
  it("converts local wall-clock time in a zone to UTC and back", () => {
    const instant = zonedInputToDate("2026-11-05T19:30", "Asia/Beirut");
    expect(instant?.toISOString()).toBe("2026-11-05T17:30:00.000Z");
    expect(dateToZonedInput(instant as Date, "Asia/Beirut")).toBe("2026-11-05T19:30");
  });

  it("handles daylight-saving zones", () => {
    expect(zonedInputToDate("2026-07-04T12:00", "America/New_York")?.toISOString()).toBe(
      "2026-07-04T16:00:00.000Z",
    );
    expect(zonedInputToDate("2026-12-04T12:00", "America/New_York")?.toISOString()).toBe(
      "2026-12-04T17:00:00.000Z",
    );
  });

  it("rejects malformed input and unknown zones", () => {
    expect(zonedInputToDate("tomorrow", "UTC")).toBeNull();
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
  });

  it("formats event times in the event's zone", () => {
    const start = new Date("2026-11-05T17:30:00Z");
    expect(formatEventWhen(start, null, "Asia/Beirut")).toContain("7:30");
  });

  it("finds the start of the UTC month", () => {
    expect(startOfUtcMonth(new Date("2026-10-17T12:00:00Z")).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});

describe("calendar links", () => {
  const input = {
    title: "Picnic",
    description: "Bring snacks",
    startsAt: new Date("2026-11-05T17:30:00Z"),
    endsAt: null,
    location: "Central Park",
    url: "https://comeby.org/picnic",
    uid: "abc",
  };

  it("builds a valid .ics file", () => {
    const ics = buildIcsFile(input);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Picnic");
    expect(ics).toContain("DTSTART:20261105T173000Z");
  });

  it("builds a Google Calendar link with a 2-hour default", () => {
    const url = new URL(googleCalendarUrl(input));
    expect(url.searchParams.get("dates")).toBe("20261105T173000Z/20261105T193000Z");
  });
});
