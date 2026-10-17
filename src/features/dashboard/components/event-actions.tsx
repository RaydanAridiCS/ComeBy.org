"use client";

import {
  Ban,
  Copy,
  ExternalLink,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_LIMITS } from "@/config/limits";
import {
  cancelEventAction,
  deleteEventAction,
  duplicateEventAction,
  setRsvpClosedAction,
} from "@/features/events/actions";
import type { DashboardData } from "../dto";

export function EventActions({ event }: { event: DashboardData["event"] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"cancel" | "delete" | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");

  const run = (
    work: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) =>
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? t("common.somethingWentWrong"));
    });

  const active = event.status === "active";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/${event.slug}`} target="_blank">
          <ExternalLink />
          {t("eventDashboard.viewInvite")}
        </Link>
      </Button>
      {active ? (
        <Button asChild size="sm">
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Pencil />
            {t("eventDashboard.edit")}
          </Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={pending}
            aria-label={t("common.more")}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              startTransition(async () => {
                const result = await duplicateEventAction(event.id);
                if (!result.ok) return void toast.error(result.error.message);
                toast.success(t("eventDashboard.duplicated"));
                router.push(`/dashboard/events/${result.data.id}/edit`);
              })
            }
          >
            <Copy />
            {t("eventDashboard.duplicate")}
          </DropdownMenuItem>
          {active && !event.over ? (
            event.rsvpClosed ? (
              <DropdownMenuItem
                onSelect={() =>
                  run(() => setRsvpClosedAction(event.id, false), t("eventDashboard.rsvpsReopened"))
                }
              >
                <LockOpen />
                {t("eventDashboard.reopenRsvps")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() =>
                  run(() => setRsvpClosedAction(event.id, true), t("eventDashboard.rsvpsClosed"))
                }
              >
                <Lock />
                {t("eventDashboard.closeRsvps")}
              </DropdownMenuItem>
            )
          ) : null}
          {active ? (
            <DropdownMenuItem onSelect={() => setDialog("cancel")}>
              <Ban />
              {t("eventDashboard.cancelEvent")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            <Trash2 />
            {t("eventDashboard.deleteEvent")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("eventDashboard.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("eventDashboard.cancelBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex flex-col gap-2 text-sm">
            {t("eventDashboard.cancelMessage")}
            <Textarea
              value={cancelMessage}
              maxLength={FIELD_LIMITS.cancelMessageMaxLength}
              placeholder={t("eventDashboard.cancelMessagePlaceholder")}
              onChange={(e) => setCancelMessage(e.target.value)}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.back")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelEventAction({ eventId: event.id, message: cancelMessage }),
                  t("eventDashboard.cancelled"),
                )
              }
            >
              {t("eventDashboard.cancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("eventDashboard.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("eventDashboard.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteEventAction(event.id);
                  if (!result.ok) return void toast.error(result.error.message);
                  toast.success(t("eventDashboard.deleted"));
                  router.replace("/dashboard");
                })
              }
            >
              {t("eventDashboard.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
