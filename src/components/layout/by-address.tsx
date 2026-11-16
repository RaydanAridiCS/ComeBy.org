"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { validateSlug } from "@/lib/slug";

/**
 * Picks the right "not found" message for a one-word address. `comeby.org/<word>` is
 * where invites live, so most misses are a mistyped invite link. But some words can
 * never be an invite (`/about`, `/wp-login.php`): those get the plain page message.
 */
export function ByAddress({ invite, page }: { invite: ReactNode; page: ReactNode }) {
  const word = usePathname().split("/")[1] ?? "";
  return validateSlug(word.toLowerCase()) === null ? invite : page;
}
