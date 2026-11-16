"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorMessage } from "@/components/layout/error-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";

/** Errors outside the dashboard and the invite, which have their own error files. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <StatusPage>
      <ErrorMessage error={error} retry={retry}>
        <Button asChild size="lg" variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </ErrorMessage>
    </StatusPage>
  );
}
