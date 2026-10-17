import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/features/events/components/event-form";
import { newEventDefaults } from "@/features/events/form-values";
import { requireUser } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("eventForm");
  return { title: t("createTitle") };
}

async function NewEventForm() {
  const user = await requireUser("/dashboard/events/new");
  return <EventForm mode="create" defaultValues={newEventDefaults(user.name)} />;
}

export default async function NewEventPage() {
  const t = await getTranslations("eventForm");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">{t("createTitle")}</h1>
        <p className="text-muted-foreground">{t("createSubtitle")}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[80vh] rounded-2xl" />}>
        <NewEventForm />
      </Suspense>
    </div>
  );
}
