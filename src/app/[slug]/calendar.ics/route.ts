import { NextResponse } from "next/server";
import { getPublicEvent } from "@/features/events/queries";
import { buildIcsFile } from "@/lib/calendar";
import { eventUrl } from "@/lib/share";
import { slugify } from "@/lib/slug";

/** The event as an .ics file, for Apple Calendar, Outlook and others. */
export async function GET(_request: Request, context: RouteContext<"/[slug]/calendar.ics">) {
  const { slug } = await context.params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event || event.hiddenAt) return new NextResponse("Not found", { status: 404 });

  const location =
    event.locationType === "online"
      ? event.onlineUrl
      : [event.locationName, event.locationAddress].filter(Boolean).join(", ") || null;
  const ics = buildIcsFile({
    title: event.status === "cancelled" ? `CANCELLED: ${event.title}` : event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location,
    url: eventUrl(event.slug),
    uid: event.id,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title) || "event"}.ics"`,
    },
  });
}
