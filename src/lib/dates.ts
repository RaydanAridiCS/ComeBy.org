import { TZDate } from "@date-fns/tz";

/*
 * Time handling rules (see docs/architecture.md → "Dates and time zones"):
 *  - The database stores instants in UTC plus the event's IANA time zone.
 *  - Hosts enter local wall-clock time ("2026-11-05T19:30") in the event's zone.
 *  - Everyone sees the event in the event's own zone, labelled with the zone name.
 */

const LOCAL_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a `datetime-local` value entered in `timeZone` into a UTC instant.
 * Returns `null` when the value is malformed.
 */
export function zonedInputToDate(value: string, timeZone: string): Date | null {
  const match = LOCAL_INPUT_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const zoned = new TZDate(year, month - 1, day, hour, minute, 0, timeZone);
  const time = zoned.getTime();
  return Number.isNaN(time) ? null : new Date(time);
}

/** Formats a UTC instant as a `datetime-local` value in `timeZone` (for pre-filling forms). */
export function dateToZonedInput(date: Date, timeZone: string): string {
  const zoned = new TZDate(date.getTime(), timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}T${pad(
    zoned.getHours(),
  )}:${pad(zoned.getMinutes())}`;
}

/** "Saturday, November 5" in the event's zone. */
export function formatEventDay(date: Date, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(date);
}

/** "7:30 PM" in the event's zone. */
export function formatEventTime(date: Date, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

/** { day: "23", month: "Oct", weekday: "Friday" } in the event's zone, for big date displays. */
export function formatDateParts(
  date: Date,
  timeZone: string,
  locale = "en",
): { day: string; month: string; weekday: string } {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
  return {
    day: format({ day: "numeric" }),
    month: format({ month: "short" }),
    weekday: format({ weekday: "long" }),
  };
}

/** Short zone label such as "GMT+3" or "EST". */
export function formatTimeZoneLabel(date: Date, timeZone: string, locale = "en"): string {
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** "Sat, Nov 5 · 7:30 PM – 11:00 PM (GMT+3)", used in emails and share messages. */
export function formatEventWhen(
  startsAt: Date,
  endsAt: Date | null,
  timeZone: string,
  locale = "en",
): string {
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(startsAt);
  const start = formatEventTime(startsAt, timeZone, locale);
  const end = endsAt ? ` – ${formatEventTime(endsAt, timeZone, locale)}` : "";
  return `${day} · ${start}${end} (${formatTimeZoneLabel(startsAt, timeZone, locale)})`;
}

/** "Nov 5, 3:42 PM" in the viewer's zone, for dashboards and timelines. */
export function formatTimestamp(date: Date, timeZone?: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

/** The instant an event counts as over: its end time, or 6 hours after it starts. */
export function eventEndInstant(startsAt: Date, endsAt: Date | null): Date {
  return endsAt ?? new Date(startsAt.getTime() + 6 * 60 * 60 * 1000);
}

export function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
