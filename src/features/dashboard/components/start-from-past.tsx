"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { duplicateEventAction } from "@/features/events/actions";

/** Copies a past event and opens the copy to set its new date (the "Duplicate" menu item). */
export function StartFromPast({ eventId, title }: { eventId: string; title: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className="max-w-full"
      onClick={() =>
        startTransition(async () => {
          const result = await duplicateEventAction(eventId);
          if (!result.ok) return void toast.error(result.error.message);
          toast.success(t("eventDashboard.duplicated"));
          router.push(`/dashboard/events/${result.data.id}/edit`);
        })
      }
    >
      {pending ? <Spinner /> : <Copy aria-hidden="true" />}
      <span className="truncate">{t("dashboard.startFrom", { title })}</span>
    </Button>
  );
}
