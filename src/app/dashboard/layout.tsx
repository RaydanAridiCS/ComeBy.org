import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryProvider } from "@/features/dashboard/components/query-provider";
import { UserMenu } from "@/features/dashboard/components/user-menu";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const t = await getTranslations("nav");
  return (
    <QueryProvider>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/dashboard/events/new">
                <Plus />
                <span className="hidden sm:inline">{t("newEvent")}</span>
              </Link>
            </Button>
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </QueryProvider>
  );
}
