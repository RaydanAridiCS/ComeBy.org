"use client";

import { useLocale } from "next-intl";
import { formatTimestamp } from "@/lib/dates";

/**
 * Shows an instant in the viewer's own time zone. The server renders it in UTC and the
 * browser re-renders it locally, so the hydration difference is expected.
 */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const locale = useLocale();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formatTimestamp(new Date(iso), undefined, locale)}
    </time>
  );
}
