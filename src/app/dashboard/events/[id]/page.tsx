import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
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
  return <EventDashboard initialData={toDashboardData(data, new Date())} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-2/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default function EventDashboardPage({ params }: PageProps<"/dashboard/events/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EventDashboardLoader params={params} />
    </Suspense>
  );
}
