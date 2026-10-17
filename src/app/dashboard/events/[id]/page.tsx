import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { EventDashboard } from "@/features/dashboard/components/event-dashboard";
import { toDashboardData } from "@/features/dashboard/dto";
import { requireUser } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { rsvpService } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

async function EventDashboardLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  await connection();
  const data = await rsvpService.dashboardData(user.id, id).catch((error: unknown) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  return (
    <EventDashboard initialData={toDashboardData(data, new Date())} theme={data.event.theme} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <Skeleton className="h-5 w-24" />
      <div className="overflow-hidden rounded-[2rem] border bg-card">
        <Skeleton className="h-28 w-full rounded-none sm:h-32" />
        <div className="flex flex-col gap-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-28 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export default function EventDashboardPage({ params }: PageProps<"/dashboard/events/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<DashboardSkeleton />}>
        <EventDashboardLoader params={params} />
      </Suspense>
    </PageTransition>
  );
}
