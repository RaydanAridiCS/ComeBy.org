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
  themeColor: "#224bb2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const umami =
    env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
      ? { src: env.NEXT_PUBLIC_UMAMI_SCRIPT_URL, id: env.NEXT_PUBLIC_UMAMI_WEBSITE_ID }
      : null;

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
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
