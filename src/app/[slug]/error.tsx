"use client";

import { useTranslations } from "next-intl";
import { ErrorMessage } from "@/components/layout/error-message";
import { StatusPage } from "@/components/layout/status-page";

/** An invite that failed to load. For guests: no app or marketing navigation, just a retry. */
export default function InviteError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <StatusPage>
      <ErrorMessage error={error} retry={retry} body={t("inviteBody")} />
    </StatusPage>
  );
}
