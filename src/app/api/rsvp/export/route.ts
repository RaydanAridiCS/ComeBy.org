import { NextResponse } from "next/server";
import { z } from "zod";
import { readRsvpCredential } from "@/features/rsvp/cookies";
import { slugify } from "@/lib/slug";
import { isAppError } from "@/server/errors";
import { rsvpService } from "@/server/services";

/**
 * Downloads one guest's own response as JSON. The guest proves who they are with the
 * private credential cookie for that event; nobody else's data is ever included.
 */
export async function GET(request: Request) {
  const eventId = z.uuid().safeParse(new URL(request.url).searchParams.get("event"));
  if (!eventId.success) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const credential = await readRsvpCredential(eventId.data);
    const data = await rsvpService.exportForGuest({ eventId: eventId.data, credential });
    const filename = `${slugify(data.event.title) || "event"}-my-response.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "rate_limited" ? 429 : 404 },
      );
    }
    throw error;
  }
}
