"use server";

import { refresh, updateTag } from "next/cache";
import { rsvpConfirmation } from "@/emails/templates";
import { formatEventWhen } from "@/lib/dates";
import type { ActionResult } from "@/lib/result";
import { absoluteUrl } from "@/lib/share";
import { runAction } from "@/server/actions/run-action";
import { AppError } from "@/server/errors";
import { jobQueue } from "@/server/jobs/queue";
import { hmac } from "@/server/security/crypto";
import { networkFingerprint } from "@/server/security/request-info";
import { verifyTurnstileToken } from "@/server/security/turnstile";
import { reportService, repositories, rsvpService } from "@/server/services";
import { queueEmail } from "@/server/services/email.service";
import { locationLabel, statusLabel } from "@/server/services/notification.service";
import { formatCredential } from "@/server/services/rsvp.service";
import { eventCacheTag } from "../events/queries";
import { deviceId, readRsvpCredential, writeRsvpCredential } from "./cookies";
import { reportSchema, submitRsvpSchema } from "./schema";

export async function submitRsvpAction(
  input: unknown,
): Promise<ActionResult<{ status: string; created: boolean; emailed: boolean }>> {
  return runAction(async () => {
    const { eventId, values, turnstileToken } = submitRsvpSchema.parse(input);
    if (!(await verifyTurnstileToken(turnstileToken))) throw new AppError("bot_check_failed");

    const credential = await readRsvpCredential(eventId);
    const deviceKey = hmac(`${await deviceId()}:${await networkFingerprint()}`);
    const previous = credential ? await rsvpService.findByCredential(eventId, credential) : null;

    const result = await rsvpService.submit({ eventId, values, credential, deviceKey });
    await writeRsvpCredential(eventId, result.credential);

    // Email a confirmation with a private edit link when the guest leaves (or changes) an email.
    const email = result.rsvp.email;
    const shouldEmail = Boolean(email) && (result.created || previous?.email !== email);
    if (email && shouldEmail) {
      const event = await repositories.events.findById(eventId);
      if (event) {
        await queueEmail(
          jobQueue,
          email,
          rsvpConfirmation({
            guestName: result.rsvp.name,
            eventTitle: event.title,
            status: statusLabel(result.rsvp.status),
            when: formatEventWhen(event.startsAt, event.endsAt, event.timezone),
            where: locationLabel(event),
            editUrl: absoluteUrl(`/r/${formatCredential(result.credential)}`),
          }),
        );
      }
    }

    refresh();
    return { status: result.rsvp.status, created: result.created, emailed: shouldEmail };
  });
}

export async function reportEventAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { eventId, reason, details } = reportSchema.parse(input);
    await reportService.report({
      eventId,
      reason,
      details,
      reporterHash: await networkFingerprint(),
    });
    // The event may have just been hidden; make the invite page reflect it right away.
    updateTag(eventCacheTag(eventId));
    return undefined;
  });
}
