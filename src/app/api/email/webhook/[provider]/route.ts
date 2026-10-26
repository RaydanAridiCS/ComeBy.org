import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { parseGenericEvent, parseResendEvent } from "@/server/adapters/email/webhooks";
import { verifyBearerSecret, verifySvixSignature } from "@/server/security/webhook-signature";
import { suppressionService } from "@/server/services";

const MAX_BODY_BYTES = 100_000;

const empty = (status: number) => new NextResponse(null, { status });

/**
 * Delivery webhooks from the email provider. Bounces and spam complaints add the address
 * to the suppression list so we stop emailing it, which protects sender reputation.
 *
 * - `/api/email/webhook/resend`: Resend webhook (set `RESEND_WEBHOOK_SECRET`).
 * - `/api/email/webhook/generic`: `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>` with
 *   `{ "type": "bounced" | "complained", "email": "..." }`, for SMTP providers.
 *
 * A provider whose secret isn't configured answers 404, as if it didn't exist.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/email/webhook/[provider]">,
) {
  const { provider } = await params;
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return empty(413);

  let event: ReturnType<typeof parseResendEvent>;
  if (provider === "resend") {
    if (!env.RESEND_WEBHOOK_SECRET) return empty(404);
    const valid = verifySvixSignature({
      secret: env.RESEND_WEBHOOK_SECRET,
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signatureHeader: request.headers.get("svix-signature"),
      body,
      now: new Date(),
    });
    if (!valid) return empty(401);
    event = parseResendEvent(safeJson(body));
  } else if (provider === "generic") {
    if (!env.EMAIL_WEBHOOK_SECRET) return empty(404);
    if (!verifyBearerSecret(request.headers.get("authorization"), env.EMAIL_WEBHOOK_SECRET)) {
      return empty(401);
    }
    event = parseGenericEvent(safeJson(body));
  } else {
    return empty(404);
  }

  // Events we don't act on (delivered, opened, transient bounces...) are still acknowledged.
  if (event) {
    for (const email of event.emails) await suppressionService.suppress(email, event.reason);
    logger.info({ provider, reason: event.reason, count: event.emails.length }, "Email webhook");
  }
  return empty(200);
}

function safeJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
