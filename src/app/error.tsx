"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="font-bold text-2xl">{t("somethingWentWrong")}</h1>
      <Button onClick={reset} className="rounded-full">
        {t("tryAgain")}
      </Button>
    </main>
  );
}
