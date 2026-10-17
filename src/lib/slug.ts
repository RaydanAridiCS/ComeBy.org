import { customAlphabet } from "nanoid";
import { FIELD_LIMITS } from "@/config/limits";
import { RESERVED_SLUGS } from "@/config/site";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const randomSuffix = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 5);

/** Turns any text into a URL-friendly slug: "Lina's B-Day!" → "linas-b-day". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, FIELD_LIMITS.slugMaxLength)
    .replace(/-+$/g, "");
}

export type SlugProblem = "too_short" | "too_long" | "invalid_characters" | "reserved";

/** Checks a host-chosen slug. Returns the problem, or `null` when it's usable. */
export function validateSlug(slug: string): SlugProblem | null {
  if (slug.length < FIELD_LIMITS.slugMinLength) return "too_short";
  if (slug.length > FIELD_LIMITS.slugMaxLength) return "too_long";
  if (!SLUG_PATTERN.test(slug)) return "invalid_characters";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

/** Builds an automatic slug from the title plus a short random suffix: "picnic-k3x9a". */
export function generateSlug(title: string): string {
  const base = slugify(title).slice(0, 32).replace(/-+$/g, "");
  return base.length > 0 ? `${base}-${randomSuffix()}` : `event-${randomSuffix()}`;
}
