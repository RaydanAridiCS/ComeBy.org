import { NextResponse } from "next/server";
import { writeRsvpCredential } from "@/features/rsvp/cookies";
import { absoluteUrl } from "@/lib/share";
import { repositories, rsvpService } from "@/server/services";
import { parseCredential } from "@/server/services/rsvp.service";

/** Where every link that doesn't check out goes: `src/app/r/invalid/page.tsx`. */
const INVALID_LINK_PATH = "/r/invalid";

/**
 * Private "change my response" links from confirmation emails. Remembers the guest's
 * response on this device, then opens the invite.
 *
 * A link that doesn't check out gets one answer whatever the reason (malformed, unknown
 * response, wrong secret, deleted event), so it can't be used to learn whether a response
 * exists or which event it belongs to.
 */
export async function GET(_request: Request, context: RouteContext<"/r/[credential]">) {
  const { credential: raw } = await context.params;
  const invalid = () => NextResponse.redirect(absoluteUrl(INVALID_LINK_PATH));

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return invalid();
  }
  const credential = parseCredential(decoded);
  const rsvp = credential
    ? await repositories.rsvps.findById(credential.rsvpId).catch(() => null)
    : null;
  if (!credential || !rsvp) return invalid();

  const verified = await rsvpService.findByCredential(rsvp.eventId, credential);
  const event = verified ? await repositories.events.findById(rsvp.eventId) : null;
  if (!verified || !event) return invalid();

  await writeRsvpCredential(event.id, credential);
  return NextResponse.redirect(absoluteUrl(`/${event.slug}`));
}
