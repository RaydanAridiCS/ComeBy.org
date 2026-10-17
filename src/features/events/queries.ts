import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { eventService } from "@/server/services";

/** Cache tag for everything derived from one event (invite page, preview image). */
export const eventCacheTag = (eventId: string) => `event:${eventId}`;
export const slugCacheTag = (slug: string) => `event-slug:${slug}`;

/**
 * The public event behind a link. Cached so invite pages and preview images are fast;
 * host edits call `updateTag(eventCacheTag(id))` to refresh it immediately.
 */
export async function getPublicEvent(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(slugCacheTag(slug));
  const event = await eventService.findPublicBySlug(slug);
  if (event) cacheTag(eventCacheTag(event.id));
  return event;
}
