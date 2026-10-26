"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { eventCacheTag, slugCacheTag } from "@/features/events/queries";
import type { ActionResult } from "@/lib/result";
import { runAction } from "@/server/actions/run-action";
import { getFileStorage } from "@/server/adapters/storage";
import { requireAdmin } from "@/server/auth/admin";
import { adminService } from "@/server/services";

const eventIdSchema = z.uuid();

/** Un-hides a reported event and clears its reports. */
export async function restoreEventAction(eventId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const event = await adminService.restore(admin, eventIdSchema.parse(eventId));
    updateTag(eventCacheTag(event.id));
    updateTag(slugCacheTag(event.slug));
    refresh();
    return undefined;
  });
}

/** Deletes a reported event, its responses and its cover image. */
export async function deleteEventAsAdminAction(eventId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const id = eventIdSchema.parse(eventId);
    const { slug, coverImageKey } = await adminService.remove(admin, id);
    if (coverImageKey) {
      const storage = await getFileStorage();
      await storage.delete(coverImageKey).catch(() => undefined);
    }
    updateTag(eventCacheTag(id));
    updateTag(slugCacheTag(slug));
    refresh();
    return undefined;
  });
}
