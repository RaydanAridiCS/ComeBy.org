import { createEvent, type EventAttributes } from "ics";

export type CalendarEventInput = {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  url: string;
  uid: string;
};

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function toIcsDate(date: Date): [number, number, number, number, number] {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

/** Builds an .ics file (Apple Calendar, Outlook, and most other calendar apps). */
export function buildIcsFile(input: CalendarEventInput): string {
  const end = input.endsAt ?? new Date(input.startsAt.getTime() + DEFAULT_DURATION_MS);
  const attributes: EventAttributes = {
    uid: `${input.uid}@comeby.org`,
    title: input.title,
    description: `${input.description}\n\n${input.url}`.trim(),
    url: input.url,
    start: toIcsDate(input.startsAt),
    startInputType: "utc",
    startOutputType: "utc",
    end: toIcsDate(end),
    endInputType: "utc",
    endOutputType: "utc",
    productId: "comeby/ics",
    ...(input.location ? { location: input.location } : {}),
  };
  const { error, value } = createEvent(attributes);
  if (error || !value) throw error ?? new Error("Could not build calendar file");
  return value;
}

function toGoogleDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** A link that opens Google Calendar with the event pre-filled. */
export function googleCalendarUrl(input: CalendarEventInput): string {
  const end = input.endsAt ?? new Date(input.startsAt.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGoogleDate(input.startsAt)}/${toGoogleDate(end)}`,
    details: `${input.description}\n\n${input.url}`.trim(),
  });
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A link that opens Outlook on the web with the event pre-filled. */
export function outlookCalendarUrl(input: CalendarEventInput): string {
  const end = input.endsAt ?? new Date(input.startsAt.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: input.title,
    startdt: input.startsAt.toISOString(),
    enddt: end.toISOString(),
    body: `${input.description}\n\n${input.url}`.trim(),
  });
  if (input.location) params.set("location", input.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** A maps search link. Free: no maps API is involved. */
export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
