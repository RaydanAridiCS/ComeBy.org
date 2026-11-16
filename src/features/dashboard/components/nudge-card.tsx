"use client";

import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/config/limits";
import { nudgeGuestsAction } from "@/features/events/actions";
import { nudgeSchema } from "@/features/events/schema";
import type { DashboardData } from "../dto";

/** The host's one-time email to "maybe" guests and pasted addresses who haven't answered. */
export function NudgeCard({ event, maybe }: { event: DashboardData["event"]; maybe: number }) {
  const t = useTranslations("eventDashboard");
  const translateError = useTranslateError();
  const [open, setOpen] = useState(false);
  const [invitees, setInvitees] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState(0);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const locale = useLocale();
  // Who the confirm step names: "2 guests who answered maybe and 1 address you added".
  const recipients = new Intl.ListFormat(locale, { type: "conjunction" }).format([
    ...(maybe > 0 ? [t("nudgeToMaybe", { count: maybe })] : []),
    ...(addresses > 0 ? [t("nudgeToAddresses", { count: addresses })] : []),
  ]);

  /** Checks the pasted list here first, so the confirm step can say who gets the email. */
  function review() {
    const parsed = nudgeSchema.shape.invitees.safeParse(invitees);
    if (!parsed.success) {
      setError(translateError(parsed.error.issues[0]?.message) ?? null);
      fieldRef.current?.focus();
      return;
    }
    if (maybe === 0 && parsed.data.length === 0) {
      setError(t("nudgeErrorNobody"));
      fieldRef.current?.focus();
      return;
    }
    setAddresses(parsed.data.length);
    setOpen(true);
  }

  async function send() {
    const result = await nudgeGuestsAction({ eventId: event.id, invitees });
    if (result.ok) {
      setInvitees("");
      setError(null);
      toast.success(t("nudgeSent", { count: result.data.recipients }));
      return { ok: true } as const;
    }
    const fieldError = result.error.fieldErrors?.invitees;
    if (!fieldError) return { ok: false, message: result.error.message } as const;
    // A problem with the list belongs under the list: close and point at it.
    setError(fieldError);
    requestAnimationFrame(() => fieldRef.current?.focus());
    return { ok: true } as const;
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
              ref={fieldRef}
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
          <Button className="self-start" onClick={review}>
            <Mail />
            {t("nudgeSend")}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("nudgeConfirmTitle")}
        description={
          <>
            {t("nudgeConfirmBody", { who: recipients })}
            {maybe > 0 ? ` ${t("nudgeConfirmMaybeHint")}` : null}
          </>
        }
        cancelLabel={t("nudgeBack")}
        confirmLabel={t("nudgeConfirm")}
        onConfirm={send}
      />
    </section>
  );
}
