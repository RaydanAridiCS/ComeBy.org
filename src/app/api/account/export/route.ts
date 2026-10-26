import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { isAppError } from "@/server/errors";
import { accountService } from "@/server/services";

/** Downloads the signed-in host's own data as JSON. Generated on the spot, never stored. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await accountService.exportData(session.user.id);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="comeby-my-data.json"',
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
