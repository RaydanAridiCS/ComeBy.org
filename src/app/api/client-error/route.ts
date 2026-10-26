import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isErrorReportingEnabled,
  reportError,
  scrubText,
} from "@/server/monitoring/error-reporting";
import { repositories } from "@/server/repositories";
import { networkFingerprint } from "@/server/security/request-info";
import { HOUR_MS } from "@/server/services/deps";

const MAX_BODY_BYTES = 10_000;
const REPORTS_PER_NETWORK_PER_HOUR = 20;

const bodySchema = z.object({
  name: z.string().max(100),
  message: z.string().max(1000),
  stack: z.string().max(6000).optional(),
  digest: z.string().max(100).optional(),
  route: z.string().max(300).optional(),
});

/** Receives browser errors from error boundaries and forwards them to error reporting. */
export async function POST(request: Request) {
  if (!isErrorReportingEnabled()) return new NextResponse(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const hits = await repositories.rateLimits.hit(
    `client-error:${await networkFingerprint()}`,
    HOUR_MS,
    new Date(),
  );
  if (hits > REPORTS_PER_NETWORK_PER_HOUR) return new NextResponse(null, { status: 429 });

  const { name, message, stack, digest, route } = parsed.data;
  await reportError(
    { name, message, stack },
    // Invite links like /r/<secret> are credentials; scrub anything token-like from the path.
    { source: "client", route: route ? scrubText(route).slice(0, 200) : undefined, digest },
  );
  return new NextResponse(null, { status: 204 });
}
