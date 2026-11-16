"use server";

import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import type { ActionResult } from "@/lib/result";
import { runAction } from "@/server/actions/run-action";
import { getFileStorage } from "@/server/adapters/storage";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { eventService, rsvpService } from "@/server/services";
import { processCoverImage } from "@/server/services/image.service";
import { FIRST_EVENT_TIP_COOKIE } from "./first-event-tip";
import { eventCacheTag, slugCacheTag } from "./queries";
import { cancelEventSchema, eventFormSchema, nudgeSchema, updateEventSchema } from "./schema";

const eventIdSchema = z.uuid();

function invalidate(eventId: string, ...slugs: string[]) {
  updateTag(eventCacheTag(eventId));
  for (const slug of slugs) updateTag(slugCacheTag(slug));
  refresh();
}

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const values = eventFormSchema.parse(input);
    const event = await eventService.create(user.id, values);
    updateTag(slugCacheTag(event.slug));
    return { id: event.id };
  });
}

export async function updateEventAction(
  input: unknown,
): Promise<ActionResult<{ changes: string[]; emailed: boolean; slug: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { eventId, values, notifyGuests } = updateEventSchema.parse(input);
    const before = await eventService.getOwned(user.id, eventId);
    const { event, changes, emailed } = await eventService.update(user.id, eventId, values, {
      notifyGuests,
    });
    invalidate(event.id, before.slug, event.slug);
    return { changes, emailed, slug: event.slug };
  });
}

export async function cancelEventAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { eventId, message } = cancelEventSchema.parse(input);
    const event = await eventService.cancel(user.id, eventId, message);
    invalidate(event.id, event.slug);
    return undefined;
  });
}

export async function setRsvpClosedAction(eventId: string, closed: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const event = await eventService.setRsvpClosed(user.id, eventIdSchema.parse(eventId), closed);
    invalidate(event.id, event.slug);
    return undefined;
  });
}

export async function nudgeGuestsAction(
  input: unknown,
): Promise<ActionResult<{ recipients: number }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { eventId, invitees } = nudgeSchema.parse(input);
    const result = await eventService.nudge(user.id, eventId, invitees);
    refresh();
    return result;
  });
}

/** Remembers on this device that the host closed the first-event tip. */
export async function dismissFirstEventTipAction(): Promise<ActionResult> {
  return runAction(async () => {
    await requireUser();
    (await cookies()).set(FIRST_EVENT_TIP_COOKIE, "closed", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
      path: "/dashboard",
      maxAge: 60 * 60 * 24 * 365,
    });
    return undefined;
  });
}

export async function duplicateEventAction(eventId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const copy = await eventService.duplicate(user.id, eventIdSchema.parse(eventId));
    refresh();
    return { id: copy.id };
  });
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const id = eventIdSchema.parse(eventId);
    const event = await eventService.getOwned(user.id, id);
    const { coverImageKey } = await eventService.delete(user.id, id);
    if (coverImageKey) {
      const storage = await getFileStorage();
      await storage.delete(coverImageKey).catch(() => undefined);
    }
    invalidate(id, event.slug);
    return undefined;
  });
}

export async function uploadCoverAction(
  formData: FormData,
): Promise<ActionResult<{ key: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const eventId = eventIdSchema.parse(formData.get("eventId"));
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("validation", { fieldErrors: { cover: "eventForm.coverWrongType" } });
    }
    const event = await eventService.getOwned(user.id, eventId);
    const { key, body } = await processCoverImage(file);
    const storage = await getFileStorage();
    await storage.put(key, body, "image/webp");
    const { previousKey } = await eventService.setCoverImage(user.id, eventId, key);
    if (previousKey) await storage.delete(previousKey).catch(() => undefined);
    invalidate(eventId, event.slug);
    return { key };
  });
}

export async function removeCoverAction(eventId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const id = eventIdSchema.parse(eventId);
    const event = await eventService.getOwned(user.id, id);
    const { previousKey } = await eventService.setCoverImage(user.id, id, null);
    if (previousKey) {
      const storage = await getFileStorage();
      await storage.delete(previousKey).catch(() => undefined);
    }
    invalidate(id, event.slug);
    return undefined;
  });
}

export async function removeRsvpAction(eventId: string, rsvpId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await rsvpService.removeByHost(user.id, eventIdSchema.parse(eventId), z.uuid().parse(rsvpId));
    const event = await eventService.getOwned(user.id, eventId);
    invalidate(event.id, event.slug);
    return undefined;
  });
}
