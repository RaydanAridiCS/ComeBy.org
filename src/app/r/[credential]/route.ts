import { NextResponse } from "next/server";
import { writeRsvpCredential } from "@/features/rsvp/cookies";
import { absoluteUrl } from "@/lib/share";
import { repositories, rsvpService } from "@/server/services";
import { parseCredential } from "@/server/services/rsvp.service";

/**
 * Private "change my response" links from confirmation emails. Remembers the guest's
 * response on this device, then opens the invite.
 */
export async function GET(_request: Request, context: RouteContext<"/r/[credential]">) {
  const { credential: raw } = await context.params;
  const credential = parseCredential(decodeURIComponent(raw));
  const rsvp = credential
    ? await repositories.rsvps.findById(credential.rsvpId).catch(() => null)
    : null;
  if (!credential || !rsvp) return NextResponse.redirect(absoluteUrl("/"));

  const verified = await rsvpService.findByCredential(rsvp.eventId, credential);
  const event = verified ? await repositories.events.findById(rsvp.eventId) : null;
  if (!verified || !event) return NextResponse.redirect(absoluteUrl("/"));

  await writeRsvpCredential(event.id, credential);
  return NextResponse.redirect(absoluteUrl(`/${event.slug}`));
}
