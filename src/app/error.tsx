"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { LostEnvelope } from "@/components/brand/lost-envelope";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_50%_at_50%_30%,var(--brand-50),transparent_70%)] px-5 py-20 text-center">
      <LostEnvelope mark="!" />
      <h1 className="heading max-w-md text-headline">{t("somethingWentWrong")}</h1>
      <Button onClick={reset} size="lg">
        <RotateCcw aria-hidden="true" />
        {t("tryAgain")}
      </Button>
    </main>
  );
}
