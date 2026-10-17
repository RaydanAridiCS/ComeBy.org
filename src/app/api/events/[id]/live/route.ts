import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { toDashboardData } from "@/features/dashboard/dto";
import { auth } from "@/server/auth/auth";
import { isAppError } from "@/server/errors";
import { rsvpService } from "@/server/services";

/** Fresh dashboard data for the host, polled every few seconds by the dashboard page. */
export async function GET(_request: Request, context: RouteContext<"/api/events/[id]/live">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const data = await rsvpService.dashboardData(session.user.id, id);
    return NextResponse.json(toDashboardData(data, new Date()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "forbidden" ? 403 : 404;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}
