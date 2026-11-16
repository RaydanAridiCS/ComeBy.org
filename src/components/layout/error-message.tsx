"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/report-client-error";

/**
 * What every error boundary shows: what happened, "Try again", and a way out.
 * It reports the error once. Needs the `common` and `errorPage` messages.
 */
export function ErrorMessage({
  error,
  retry,
  body,
  children,
}: {
  error: unknown;
  retry: () => void;
  /** Replaces the default explanation. */
  body?: string;
  /** A secondary action, such as a link home. */
  children?: ReactNode;
}) {
  const t = useTranslations();
  useEffect(() => {
    reportClientError(error);
  }, [error]);
  return (
    <StatusMessage mark="!" title={t("errorPage.title")} body={body ?? t("errorPage.body")}>
      <Button onClick={retry} size="lg">
        <RotateCcw aria-hidden="true" />
        {t("common.tryAgain")}
      </Button>
      {children}
    </StatusMessage>
  );
}
