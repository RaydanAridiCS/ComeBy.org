import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { eventService } from "@/server/services";

/**
 * Where a confirmation link lands a new host (`FIRST_RUN_PATH`): straight into the new-event
 * form while they have no events, otherwise their event list. A visitor without a session
 * goes to sign in. Relative `Location`s, so the redirect works behind the proxy.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const to = !session
    ? "/login"
    : (await eventService.hasEvents(session.user.id))
      ? "/dashboard"
      : "/dashboard/events/new";
  return new Response(null, {
    status: 307,
    headers: { Location: to, "Cache-Control": "private, no-store" },
  });
}
