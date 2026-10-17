"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, HelpCircle, PartyPopper, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useState, useTransition } from "react";
import { Controller, type FieldPath, useForm, useWatch } from "react-hook-form";
import type { Country } from "react-phone-number-input";
import PhoneInput from "react-phone-number-input/input";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/config/limits";
import type { CustomQuestion } from "@/db/schema";
import { cn } from "@/lib/utils";
import { submitRsvpAction } from "../actions";
import { type RsvpFormInput, type RsvpStatusValue, rsvpFormSchema } from "../schema";
import { Celebration } from "./celebration";
import { Turnstile } from "./turnstile";

export type RsvpEventSettings = {
  eventId: string;
  hostName: string;
  phoneMode: "required" | "optional" | "hidden";
  allowMessage: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  questions: CustomQuestion[];
};

type Props = {
  settings: RsvpEventSettings;
  existing: (RsvpFormInput & { status: RsvpStatusValue }) | null;
  turnstileSiteKey: string | undefined;
  /** Rendered next to the success message (e.g. add-to-calendar). */
  afterSuccess?: ReactNode;
};

const inputClass =
  "invite-input h-11 w-full rounded-xl border px-3.5 text-base outline-none transition";

/** Best guess of the guest's country for phone formatting, from the browser language. */
function guessCountry(): Country | undefined {
  if (typeof navigator === "undefined") return undefined;
  for (const language of navigator.languages ?? [navigator.language]) {
    const region = language.split("-")[1]?.toUpperCase();
    if (region && /^[A-Z]{2}$/.test(region)) return region as Country;
  }
  return undefined;
}

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="font-medium text-sm">
      {children}
      {optional ? <span className="ms-1 font-normal text-invite-muted">({optional})</span> : null}
    </label>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-red-600 text-sm dark:text-red-400">{children}</p>;
}

/** The guest's response form: tap a status, type a name, done. */
export function RsvpForm({ settings, existing, turnstileSiteKey, afterSuccess }: Props) {
  const t = useTranslations("rsvp");
  const tCommon = useTranslations("common");
  const translateError = useTranslateError();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"form" | "summary" | "done">(existing ? "summary" : "form");
  const [submitted, setSubmitted] = useState<{ status: RsvpStatusValue; emailed: boolean } | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [country] = useState(guessCountry);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const form = useForm<RsvpFormInput>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: existing ?? {
      status: undefined,
      name: "",
      phone: "",
      email: "",
      message: "",
      plusOnes: 0,
      answers: {},
    },
  });
  const { control, register, formState, setError, setValue } = form;
  const { errors } = formState;
  const status = useWatch({ control, name: "status" });

  const statusOptions: { value: RsvpStatusValue; label: string; icon: typeof Check }[] = [
    { value: "going", label: t("going"), icon: Check },
    { value: "maybe", label: t("maybe"), icon: HelpCircle },
    { value: "not_going", label: t("notGoing"), icon: X },
  ];

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await submitRsvpAction({
        eventId: settings.eventId,
        values,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (!result.ok) {
        for (const [path, message] of Object.entries(result.error.fieldErrors ?? {})) {
          setError(path.replace(/^values\./, "") as FieldPath<RsvpFormInput>, { message });
        }
        setFormError(result.error.message);
        return;
      }
      setSubmitted({ status: result.data.status as RsvpStatusValue, emailed: result.data.emailed });
      setView("done");
    });
  });

  if (view === "done" && submitted) {
    const title =
      submitted.status === "going"
        ? t("doneGoingTitle")
        : submitted.status === "maybe"
          ? t("doneMaybeTitle")
          : t("doneNotGoingTitle");
    return (
      <div
        className="relative flex flex-col items-center gap-3 py-4 text-center"
        aria-live="polite"
      >
        {submitted.status === "going" ? <Celebration /> : null}
        <PartyPopper className="size-10 text-invite-accent" aria-hidden="true" />
        <h2 className="invite-heading font-bold text-2xl">{title}</h2>
        <p className="text-invite-muted">{t("doneBody", { host: settings.hostName })}</p>
        {submitted.emailed ? (
          <p className="text-invite-muted text-sm">{t("editLinkSent")}</p>
        ) : null}
        {afterSuccess}
        <button
          type="button"
          className="text-sm underline underline-offset-4"
          onClick={() => setView("form")}
        >
          {t("changeResponse")}
        </button>
      </div>
    );
  }

  if (view === "summary" && existing) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="font-semibold text-lg">
          {t("yourResponse", {
            status:
              existing.status === "going"
                ? t("going")
                : existing.status === "maybe"
                  ? t("maybe")
                  : t("notGoing"),
          })}
        </p>
        <button
          type="button"
          className="rounded-full bg-invite-accent-soft px-5 py-2.5 font-semibold text-sm"
          onClick={() => setView("form")}
        >
          {t("changeResponse")}
        </button>
      </div>
    );
  }

  const going = status === "going";
  const plusOneOptions = Array.from(
    { length: Math.min(settings.maxPlusOnes, LIMITS.maxPlusOnesPerGuest) + 1 },
    (_, count) => count,
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <h2 className="invite-heading text-center font-bold text-2xl">{t("title")}</h2>
      <div role="radiogroup" aria-label={t("title")} className="grid grid-cols-3 gap-2">
        {statusOptions.map((option) => {
          const selected = status === option.value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: large tappable buttons beat tiny native radios on phones
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setValue("status", option.value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 font-semibold text-sm transition active:scale-95",
                selected
                  ? "bg-invite-accent text-invite-accent-fg shadow-md"
                  : "bg-invite-accent-soft hover:brightness-95",
              )}
            >
              <option.icon className="size-5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      {status ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rsvp-name">{t("name")}</Label>
            <input
              id="rsvp-name"
              autoComplete="name"
              className={inputClass}
              placeholder={t("namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <ErrorText>{translateError(errors.name?.message)}</ErrorText>
          </div>

          {settings.phoneMode !== "hidden" ? (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="rsvp-phone"
                optional={
                  settings.phoneMode === "optional" ? tCommon("optional").toLowerCase() : undefined
                }
              >
                {t("phone")}
              </Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="rsvp-phone"
                    autoComplete="tel"
                    className={inputClass}
                    defaultCountry={country}
                    international={!country}
                    withCountryCallingCode={!country}
                    value={field.value || undefined}
                    onChange={(value) => field.onChange(value ?? "")}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errors.phone)}
                  />
                )}
              />
              <ErrorText>{translateError(errors.phone?.message)}</ErrorText>
            </div>
          ) : null}

          {going && settings.allowPlusOnes ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rsvp-plus">{t("plusOnes")}</Label>
              <Controller
                control={control}
                name="plusOnes"
                render={({ field }) => (
                  <select
                    id="rsvp-plus"
                    className={inputClass}
                    value={field.value ?? 0}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  >
                    {plusOneOptions.map((count) => (
                      <option key={count} value={count}>
                        {count === 0 ? t("plusOnesNone") : t("plusOnesCount", { count })}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          ) : null}

          {settings.questions.map((question) => {
            const id = `rsvp-q-${question.id}`;
            const error = (errors.answers as Record<string, { message?: string }> | undefined)?.[
              question.id
            ];
            return (
              <div key={question.id} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={id}
                  optional={question.required ? undefined : tCommon("optional").toLowerCase()}
                >
                  {question.label}
                </Label>
                {question.type === "choice" ? (
                  <select id={id} className={inputClass} {...register(`answers.${question.id}`)}>
                    <option value="">{t("choose")}</option>
                    {(question.choices ?? []).map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    className={inputClass}
                    maxLength={300}
                    {...register(`answers.${question.id}`)}
                  />
                )}
                <ErrorText>{translateError(error?.message)}</ErrorText>
              </div>
            );
          })}

          {settings.allowMessage ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rsvp-message" optional={tCommon("optional").toLowerCase()}>
                {t("message")}
              </Label>
              <textarea
                id="rsvp-message"
                rows={2}
                maxLength={LIMITS.guestMessageMaxLength}
                className={cn(inputClass, "h-auto py-2.5")}
                placeholder={t("messagePlaceholder")}
                {...register("message")}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rsvp-email" optional={tCommon("optional").toLowerCase()}>
              {t("email")}
            </Label>
            <input
              id="rsvp-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className={inputClass}
              {...register("email")}
            />
            <p className="text-invite-muted text-xs">{t("emailHint")}</p>
            <ErrorText>{translateError(errors.email?.message)}</ErrorText>
          </div>

          <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />

          {formError ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-red-700 text-sm dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-invite-accent font-semibold text-base text-invite-accent-fg shadow-md transition hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
          >
            {pending ? <Spinner /> : null}
            {pending ? t("submitting") : existing ? t("update") : t("submit")}
          </button>
          <p className="text-center text-invite-muted text-xs">{t("privacyNote")}</p>
        </div>
      ) : null}
    </form>
  );
}
