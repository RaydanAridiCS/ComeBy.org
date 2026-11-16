import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/config/site";
import { env } from "@/env";
import { clientMessages, ROOT_NAMESPACES } from "@/i18n/client-messages";
import { fontVariables } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: { default: t("metaTitle"), template: `%s · ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    openGraph: { siteName: SITE.name, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets pages reach under the notch and home bar; globals.css pads for them (--safe-*).
  viewportFit: "cover",
  themeColor: "#224bb2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const umami =
    env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
      ? { src: env.NEXT_PUBLIC_UMAMI_SCRIPT_URL, id: env.NEXT_PUBLIC_UMAMI_WEBSITE_ID }
      : null;

  const t = await getTranslations("common");

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Every page's <main> has id="main" and tabIndex={-1}, so this moves focus there. */}
        <a
          href="#main"
          className="sr-only z-[100] rounded-xl bg-primary font-semibold text-primary-foreground text-sm shadow-lg outline-none ring-4 ring-ring/40 focus:not-sr-only focus:fixed focus:start-[calc(0.75rem+var(--safe-left))] focus:top-[calc(0.75rem+var(--safe-top))] focus:px-4 focus:py-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={await clientMessages(ROOT_NAMESPACES)}>
          {children}
        </NextIntlClientProvider>
        {umami ? (
          <Script src={umami.src} data-website-id={umami.id} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  );
}
