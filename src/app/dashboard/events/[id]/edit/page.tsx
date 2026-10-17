import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Suspense fallback={null}>
        {params.then(({ id }) => (
          <Link
            href={`/dashboard/events/${id}`}
            className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {t("common.back")}
          </Link>
        ))}
      </Suspense>
      <h1 className="font-bold text-2xl tracking-tight">{t("eventForm.editTitle")}</h1>
      <Suspense fallback={<Skeleton className="h-[80vh] rounded-2xl" />}>
        <EditEventForm params={params} />
      </Suspense>
    </div>
  );
}
