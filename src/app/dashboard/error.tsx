"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorMessage } from "@/components/layout/error-message";
import { Button } from "@/components/ui/button";

/** An error on a dashboard page. The dashboard layout stays, so the header still works. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center sm:py-20">
      <ErrorMessage error={error} retry={retry}>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">{t("backToEvents")}</Link>
        </Button>
      </ErrorMessage>
    </div>
  );
}
