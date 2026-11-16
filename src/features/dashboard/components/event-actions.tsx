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
import { type ComponentProps, useRef, useState, useTransition } from "react";
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

/** Copies the event and opens the copy's edit form, where the host picks the new date. */
function useDuplicate(eventId: string) {
  const t = useTranslations("eventDashboard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateEventAction(eventId);
      if (!result.ok) return void toast.error(result.error.message);
      toast.success(t("duplicated"));
      router.push(`/dashboard/events/${result.data.id}/edit`);
    });
  return { pending, duplicate };
}

type ActionButtonProps = { eventId: string } & Omit<
  ComponentProps<typeof Button>,
  "onClick" | "asChild"
>;

export function DuplicateButton({ eventId, disabled, children, ...props }: ActionButtonProps) {
  const { pending, duplicate } = useDuplicate(eventId);
  return (
    <Button {...props} disabled={disabled || pending} onClick={duplicate}>
      {children}
    </Button>
  );
}

export function ReopenRsvpsButton({ eventId, disabled, children, ...props }: ActionButtonProps) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setRsvpClosedAction(eventId, false);
          if (result.ok) toast.success(t("eventDashboard.rsvpsReopened"));
          else toast.error(result.error?.message ?? t("common.somethingWentWrong"));
        })
      }
    >
      {children}
    </Button>
  );
}

export function EventActions({ event }: { event: DashboardData["event"] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { pending: duplicating, duplicate } = useDuplicate(event.id);
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

  // A cancelled or ended event can't be edited into something useful: starting the next one
  // from it is the main thing left. An ended event can still be edited, from the menu.
  const editable = event.status === "active";
  const upcoming = editable && !event.over;
  const duplicateFirst = event.state === "ended" || event.state === "cancelled";
  // Closed by its deadline: "Close RSVPs" would change nothing, and reopening means a new deadline.
  const canClose = upcoming && !event.rsvpClosed && event.closedBy !== "deadline";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/${event.slug}`} target="_blank">
          <ExternalLink />
          {t("eventDashboard.viewInvite")}
        </Link>
      </Button>
      {duplicateFirst ? (
        <Button size="sm" disabled={duplicating} onClick={duplicate}>
          <Copy />
          {t("eventDashboard.duplicate")}
        </Button>
      ) : editable ? (
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
            disabled={pending || duplicating}
            aria-label={t("common.more")}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          {duplicateFirst ? (
            editable ? (
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/events/${event.id}/edit`}>
                  <Pencil />
                  {t("eventDashboard.edit")}
                </Link>
              </DropdownMenuItem>
            ) : null
          ) : (
            <DropdownMenuItem onSelect={duplicate}>
              <Copy />
              {t("eventDashboard.duplicate")}
            </DropdownMenuItem>
          )}
          {upcoming && event.rsvpClosed ? (
            <DropdownMenuItem
              onSelect={() =>
                run(() => setRsvpClosedAction(event.id, false), t("eventDashboard.rsvpsReopened"))
              }
            >
              <LockOpen />
              {t("eventDashboard.reopenRsvps")}
            </DropdownMenuItem>
          ) : null}
          {canClose ? (
            <DropdownMenuItem
              onSelect={() =>
                run(() => setRsvpClosedAction(event.id, true), t("eventDashboard.rsvpsClosed"))
              }
            >
              <Lock />
              {t("eventDashboard.closeRsvps")}
            </DropdownMenuItem>
          ) : null}
          {upcoming ? (
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
