"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Validation messages are translation keys (e.g. "rsvp.nameRequired"), shared by the
 * browser and the server. This turns a key, or an already-translated server message,
 * into text for display.
 */
export function useTranslateError() {
  const t = useTranslations();
  return useCallback(
    (message: string | undefined, params?: Record<string, string | number>): string | undefined => {
      if (!message) return undefined;
      return t.has(message as never) ? t(message as never, params as never) : message;
    },
    [t],
  );
}
