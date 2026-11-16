import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/features/events/components/event-form";
import { FIRST_EVENT_TIP_COOKIE } from "@/features/events/first-event-tip";
import { newEventDefaults } from "@/features/events/form-values";
import { requireUser } from "@/server/auth/session";
import { eventService } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("eventForm");
  return { title: t("createTitle") };
}

function FormSkeleton() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-5">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
      <Skeleton className="hidden h-[36rem] rounded-[2rem] lg:block" />
    </div>
  );
}

async function NewEventForm() {
  const user = await requireUser("/dashboard/events/new");
  const [hasEvents, cookieStore] = await Promise.all([eventService.hasEvents(user.id), cookies()]);
  return (
    <EventForm
      mode="create"
      defaultValues={newEventDefaults(user.name)}
      // Only on a host's first event, until they close it.
      firstEventTip={!hasEvents && !cookieStore.has(FIRST_EVENT_TIP_COOKIE)}
    />
  );
}

export default async function NewEventPage() {
  const t = await getTranslations("eventForm");
  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        <div className="flex animate-rise flex-col gap-1.5">
          <h1 className="heading text-title">{t("createTitle")}</h1>
          <p className="text-muted-foreground">{t("createSubtitle")}</p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <NewEventForm />
        </Suspense>
      </div>
    </PageTransition>
  );
}
