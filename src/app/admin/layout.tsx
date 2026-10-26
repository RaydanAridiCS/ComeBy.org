import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Toaster } from "@/components/ui/sonner";
import { ADMIN_NAMESPACES, clientMessages } from "@/i18n/client-messages";
import { bricolage } from "../brand-font";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations("admin");
  return (
    <NextIntlClientProvider messages={await clientMessages(ADMIN_NAMESPACES)}>
      <div className={`${bricolage.variable} flex min-h-dvh flex-1 flex-col bg-muted/30`}>
        <header className="border-b bg-background">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
            <Logo href="/dashboard" />
            <Link
              href="/dashboard"
              className="font-medium text-muted-foreground text-sm hover:text-foreground"
            >
              {t("backToDashboard")}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
          {children}
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </NextIntlClientProvider>
  );
}
