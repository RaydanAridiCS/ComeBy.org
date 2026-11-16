"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import { ErrorMessage } from "@/components/layout/error-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import { fontVariables } from "./fonts";
import "./globals.css";

function Fallback({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <StatusPage>
      <ErrorMessage error={error} retry={retry}>
        <Button asChild size="lg" variant="outline">
          {/* A full page load on purpose: the app around this page has crashed. */}
          <a href="/">{t("home")}</a>
        </Button>
      </ErrorMessage>
    </StatusPage>
  );
}

/**
 * Last-resort error page for crashes in the root layout. It replaces the layout, so it
 * brings its own document, styles and translations. It can't export metadata, so the
 * title is a plain `<title>`.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>{en.errorPage.title}</title>
        <NextIntlClientProvider
          locale={DEFAULT_LOCALE}
          messages={{ common: en.common, errorPage: en.errorPage }}
          timeZone="UTC"
        >
          <Fallback error={error} retry={retry} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
