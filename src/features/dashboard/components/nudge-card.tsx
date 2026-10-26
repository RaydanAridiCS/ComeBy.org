"use client";

import { Mail } from "lucide-react";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/config/limits";
import { nudgeGuestsAction } from "@/features/events/actions";
import type { DashboardData } from "../dto";

/** The host's one-time email to "maybe" guests and pasted addresses who haven't answered. */
export function NudgeCard({ event, maybe }: { event: DashboardData["event"]; maybe: number }) {
  const t = useTranslations("eventDashboard");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [invitees, setInvitees] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send() {
    startTransition(async () => {
      const result = await nudgeGuestsAction({ eventId: event.id, invitees });
      if (result.ok) {
        setInvitees("");
        setError(null);
        toast.success(t("nudgeSent"));
        return;
      }
      setError(result.error.fieldErrors?.invitees ?? result.error.message);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="heading text-xl">{t("nudgeTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("nudgeBody")}</p>
      </div>

      {event.nudgeSent ? (
        <p className="text-sm">{t("nudgeAlreadySent")}</p>
      ) : (
        <>
          <p className="font-medium text-sm">{t("nudgeMaybeCount", { count: maybe })}</p>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="nudge-invitees">{t("nudgeInviteesLabel")}</FieldLabel>
            <Textarea
              id="nudge-invitees"
              value={invitees}
              rows={3}
              maxLength={20_000}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t("nudgeInviteesPlaceholder")}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setInvitees(e.target.value);
                setError(null);
              }}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>
                {t("nudgeInviteesHint", { max: LIMITS.inviteesPerEvent })}
              </FieldDescription>
            )}
          </Field>
          <Button className="self-start" disabled={pending} onClick={() => setOpen(true)}>
            <Mail />
            {t("nudgeSend")}
          </Button>
        </>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nudgeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("nudgeConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("nudgeBack")}</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={send}>
              {t("nudgeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
