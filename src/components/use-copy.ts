"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

/** Copies text to the clipboard and confirms with a toast. */
export function useCopy() {
  const t = useTranslations("common");
  return useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } catch {
        toast.error(t("somethingWentWrong"));
      }
    },
    [t],
  );
}
