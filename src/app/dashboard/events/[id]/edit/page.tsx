import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { LIMITS } from "@/config/limits";
import { EventForm } from "@/features/events/components/event-form";
import { eventToFormValues } from "@/features/events/form-values";
import { fileUrl } from "@/server/adapters/storage";
import { requireUser } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { eventService } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("eventForm");
  return { title: t("editTitle") };
}

async function EditEventForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}/edit`);
  if (!z.uuid().safeParse(id).success) notFound();
  const event = await eventService.getOwned(user.id, id).catch((error: unknown) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  return (
    <EventForm
      mode="edit"
      eventId={event.id}
      defaultValues={eventToFormValues(event)}
      coverUrl={event.coverImageKey ? fileUrl(event.coverImageKey) : null}
      updateEmailsRemaining={Math.max(0, LIMITS.updateEmailsPerEvent - event.updateEmailsSent)}
    />
  );
}

export default async function EditEventPage({ params }: PageProps<"/dashboard/events/[id]/edit">) {
  const t = await getTranslations();
  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          {params.then(({ id }) => (
            <Link
              href={`/dashboard/events/${id}`}
              className="inline-flex items-center gap-1.5 self-start rounded-lg py-1 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> {t("common.back")}
            </Link>
          ))}
        </Suspense>
        <h1 className="heading animate-rise text-title">{t("eventForm.editTitle")}</h1>
        <Suspense
          fallback={
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <Skeleton className="h-[70vh] rounded-3xl" />
              <Skeleton className="hidden h-[36rem] rounded-[2rem] lg:block" />
            </div>
          }
        >
          <EditEventForm params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
