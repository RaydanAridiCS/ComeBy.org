import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { EventList, EventListSkeleton } from "@/features/dashboard/components/event-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        <div className="flex animate-rise flex-col gap-1.5">
          <h1 className="heading text-title">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Suspense fallback={<EventListSkeleton />}>
          <EventList />
        </Suspense>
      </div>
    </PageTransition>
  );
}
