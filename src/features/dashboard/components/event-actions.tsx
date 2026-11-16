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
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog, outcomeOf } from "@/components/confirm-dialog";
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
  // The dialogs open from the menu, so focus comes back to the menu button.
  const moreRef = useRef<HTMLButtonElement>(null);

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
            ref={moreRef}
            variant="outline"
            size="icon-sm"
            disabled={pending}
            aria-label={t("common.more")}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
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

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("eventDashboard.cancelTitle")}
        description={t("eventDashboard.cancelBody")}
        cancelLabel={t("common.back")}
        confirmLabel={t("eventDashboard.cancelConfirm")}
        returnFocusTo={() => moreRef.current}
        onConfirm={async () => {
          const result = await cancelEventAction({ eventId: event.id, message: cancelMessage });
          if (result.ok) {
            toast.success(t("eventDashboard.cancelled"));
            setCancelMessage("");
          }
          return outcomeOf(result);
        }}
      >
        <label className="flex flex-col gap-2 text-sm">
          {t("eventDashboard.cancelMessage")}
          <Textarea
            value={cancelMessage}
            maxLength={FIELD_LIMITS.cancelMessageMaxLength}
            placeholder={t("eventDashboard.cancelMessagePlaceholder")}
            onChange={(e) => setCancelMessage(e.target.value)}
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        variant="destructive"
        title={t("eventDashboard.deleteTitle")}
        description={t("eventDashboard.deleteBody")}
        confirmLabel={t("eventDashboard.deleteConfirm")}
        returnFocusTo={() => moreRef.current}
        onConfirm={async () => {
          const result = await deleteEventAction(event.id);
          if (result.ok) {
            toast.success(t("eventDashboard.deleted"));
            router.replace("/dashboard");
          }
          return outcomeOf(result);
        }}
      />
    </div>
  );
}
