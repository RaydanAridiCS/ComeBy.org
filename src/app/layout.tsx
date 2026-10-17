import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE } from "@/config/site";
import { env } from "@/env";
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
  themeColor: "#e85d3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const umami =
    env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
      ? { src: env.NEXT_PUBLIC_UMAMI_SCRIPT_URL, id: env.NEXT_PUBLIC_UMAMI_WEBSITE_ID }
      : null;

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" richColors />
        </NextIntlClientProvider>
        {umami ? (
          <Script src={umami.src} data-website-id={umami.id} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  );
}
