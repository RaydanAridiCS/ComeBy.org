import { Plus } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/features/dashboard/components/query-provider";
import { UserMenu } from "@/features/dashboard/components/user-menu";
import { clientMessages, DASHBOARD_NAMESPACES } from "@/i18n/client-messages";
import { bricolage } from "../brand-font";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const t = await getTranslations("nav");
  return (
    <NextIntlClientProvider messages={await clientMessages(DASHBOARD_NAMESPACES)}>
      <QueryProvider>
        <div
          className={`${bricolage.variable} flex min-h-dvh flex-1 flex-col bg-[radial-gradient(80%_40%_at_50%_0%,var(--brand-50),transparent_70%)]`}
        >
          <header className="sticky top-0 z-40 px-3 pt-3 [view-transition-name:site-header] sm:px-4">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 ps-4 pe-2 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-6">
                <Logo href="/dashboard" />
                <nav aria-label={t("mainNav")} className="hidden items-center gap-1 sm:flex">
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("myEvents")}
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("settings")}
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild size="sm">
                  <Link href="/dashboard/events/new">
                    <Plus aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">{t("newEvent")}</span>
                  </Link>
                </Button>
                <Suspense fallback={<Skeleton className="size-11 rounded-full sm:size-10" />}>
                  <UserMenu />
                </Suspense>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
            {children}
          </main>
        </div>
      </QueryProvider>
      <Toaster position="top-center" richColors />
    </NextIntlClientProvider>
  );
}
