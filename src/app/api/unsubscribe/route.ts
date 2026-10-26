import { type NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/server/security/unsubscribe-token";
import { suppressionService } from "@/server/services";

/**
 * One-click unsubscribe (RFC 8058). Mail apps POST here when someone taps the
 * "Unsubscribe" button next to the sender. A browser GET goes to the confirmation page.
 */
export async function POST(request: NextRequest) {
  const verified = verifyUnsubscribeToken(request.nextUrl.searchParams.get("t"));
  if (!verified) return new NextResponse(null, { status: 400 });
  await suppressionService.unsubscribe(verified.scope, verified.email);
  return new NextResponse(null, { status: 200 });
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(token)}`, request.url));
}
