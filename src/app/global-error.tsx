"use client";

import { RotateCcw } from "lucide-react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useEffect } from "react";
import { LostEnvelope } from "@/components/brand/lost-envelope";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import { reportClientError } from "@/lib/report-client-error";
import { fontVariables } from "./fonts";
import "./globals.css";

function Fallback({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    reportClientError(error);
  }, [error]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_50%_at_50%_30%,var(--brand-50),transparent_70%)] px-5 py-20 text-center">
      <LostEnvelope mark="!" />
      <h1 className="heading max-w-md text-headline">{t("somethingWentWrong")}</h1>
      <Button onClick={retry} size="lg">
        <RotateCcw aria-hidden="true" />
        {t("tryAgain")}
      </Button>
    </main>
  );
}

/**
 * Last-resort error page for crashes in the root layout. It replaces the layout, so it
 * brings its own document, styles and translations.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider
          locale={DEFAULT_LOCALE}
          messages={{ common: en.common }}
          timeZone="UTC"
        >
          <Fallback error={error} retry={retry} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
