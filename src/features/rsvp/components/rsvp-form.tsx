"use client";

import { Check, HelpCircle, type LucideIcon, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useId, useState, useTransition } from "react";
import { Controller, type FieldPath, type Resolver, useForm, useWatch } from "react-hook-form";
import type { Country } from "react-phone-number-input";
import { useRovingRadio } from "@/components/forms/use-roving-radio";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/config/limits";
import type { CustomQuestion } from "@/db/schema";
import { cn } from "@/lib/utils";
import { submitRsvpAction } from "../actions";
import type { RsvpFormInput, RsvpStatusValue } from "../schema";

export type RsvpEventSettings = {
  eventId: string;
  hostName: string;
  phoneMode: "required" | "optional" | "hidden";
  allowMessage: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  questions: CustomQuestion[];
  /** The theme's confetti colours for the "You're in!" burst. */
  confettiColors: string[];
};

type Props = {
  settings: RsvpEventSettings;
  existing: (RsvpFormInput & { status: RsvpStatusValue }) | null;
  turnstileSiteKey: string | undefined;
  /** Rendered next to the success message (e.g. add-to-calendar). */
  afterSuccess?: ReactNode;
};

const inputClass =
  "invite-input h-12 w-full rounded-2xl border px-4 text-base outline-none transition-[border-color,box-shadow]";

/*
 * The heavy parts of the form load on demand, so the invite paints fast on slow
 * phones: the phone field and bot check once the guest picks a status,
 * validation (zod) on the first check, and the celebration after a response.
 */
const PhoneInput = dynamic(() => import("react-phone-number-input/input"), {
  ssr: false,
  loading: () => <span className={`${inputClass} block`} aria-hidden="true" />,
});
const Turnstile = dynamic(
  () => import("@/components/forms/turnstile").then((module) => module.Turnstile),
  {
    ssr: false,
  },
);
// The success moment is the only part that needs the animation library.
const RsvpSuccess = dynamic(() => import("./rsvp-success").then((module) => module.RsvpSuccess), {
  ssr: false,
});

const lazyResolver: Resolver<RsvpFormInput> = async (values, context, options) => {
  const [{ zodResolver }, { rsvpFormSchema }] = await Promise.all([
    import("@hookform/resolvers/zod"),
    import("../schema"),
  ]);
  return zodResolver(rsvpFormSchema)(values, context, options);
};
const errorClass = "text-[color-mix(in_oklab,#e5484d_75%,var(--invite-fg))] text-sm";
const STATUS_ICONS: Record<RsvpStatusValue, LucideIcon> = {
  going: Check,
  maybe: HelpCircle,
  not_going: X,
};

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
  id,
  children,
  optional,
}: {
  htmlFor?: string;
  id?: string;
  children: ReactNode;
  optional?: string;
}) {
  const className = "font-semibold text-sm";
  const content = (
    <>
      {children}
      {optional ? <span className="ms-1 font-normal text-invite-muted">({optional})</span> : null}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} id={id} className={className}>
      {content}
    </label>
  ) : (
    <p id={id} className={className}>
      {content}
    </p>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className={errorClass}>{children}</p>;
}

/** The guest's response form: tap a status, type a name, done. */
export function RsvpForm({ settings, existing, turnstileSiteKey, afterSuccess }: Props) {
  const t = useTranslations("rsvp");
  const tCommon = useTranslations("common");
  const translateError = useTranslateError();
  const plusLabelId = useId();
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
    resolver: lazyResolver,
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
  const plusOnes = useWatch({ control, name: "plusOnes" }) ?? 0;

  const statusLabel = (value: RsvpStatusValue) =>
    value === "going" ? t("going") : value === "maybe" ? t("maybe") : t("notGoing");
  const statusValues: RsvpStatusValue[] = ["going", "maybe", "not_going"];
  const selectStatus = (value: RsvpStatusValue) =>
    setValue("status", value, { shouldValidate: true });
  const statusRadio = useRovingRadio(statusValues, status, selectStatus);

  const plusOneOptions = Array.from(
    { length: Math.min(settings.maxPlusOnes, LIMITS.maxPlusOnesPerGuest) + 1 },
    (_, count) => count,
  );
  const selectPlusOnes = (count: number) => setValue("plusOnes", count);
  const plusRadio = useRovingRadio(plusOneOptions, plusOnes, selectPlusOnes);

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

  let content: ReactNode;

  if (view === "done" && submitted) {
    content = (
      <RsvpSuccess
        status={submitted.status}
        emailed={submitted.emailed}
        hostName={settings.hostName}
        confettiColors={settings.confettiColors}
        afterSuccess={afterSuccess}
        onChange={() => setView("form")}
      />
    );
  } else if (view === "summary" && existing) {
    const Icon = STATUS_ICONS[existing.status];
    content = (
      <div key="summary" className="flex animate-pop flex-col items-center gap-4 text-center">
        <div className="invite-chip relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-3xl px-5 py-6">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              existing.status === "going"
                ? "bg-invite-accent text-invite-accent-fg"
                : "bg-(--invite-card) text-(--invite-accent-ink)",
            )}
            aria-hidden="true"
          >
            <Icon className="size-6" />
          </span>
          <p className="font-semibold text-lg">
            {t("yourResponse", { status: statusLabel(existing.status) })}
          </p>
          <span className="w-full border-(--invite-card-border) border-t border-dashed" />
          <p className="text-invite-muted text-sm">{t("doneBody", { host: settings.hostName })}</p>
        </div>
        <button
          type="button"
          className="invite-focus inline-flex h-11 items-center rounded-full bg-invite-accent px-6 font-semibold text-invite-accent-fg text-sm shadow-md transition hover:brightness-105 active:scale-[0.97]"
          onClick={() => setView("form")}
        >
          {t("changeResponse")}
        </button>
      </div>
    );
  } else {
    const going = status === "going";
    content = (
      <form key="form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <h2 className="invite-heading text-center text-[1.75rem] leading-tight">{t("title")}</h2>
        <div role="radiogroup" aria-label={t("title")} className="grid grid-cols-3 gap-2">
          {statusValues.map((value, index) => {
            const selected = status === value;
            const Icon = STATUS_ICONS[value];
            return (
              // biome-ignore lint/a11y/useSemanticElements: large tappable buttons beat tiny native radios on phones
              <button
                key={value}
                ref={(element) => {
                  statusRadio.refs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={statusRadio.tabIndex(value, index)}
                onClick={() => selectStatus(value)}
                onKeyDown={(event) => statusRadio.onKeyDown(event, index)}
                className={cn(
                  "invite-focus flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 font-semibold text-[0.9375rem] transition-[background-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94]",
                  selected
                    ? "scale-[1.03] bg-invite-accent text-invite-accent-fg shadow-md"
                    : "invite-chip hover:brightness-[0.97]",
                )}
              >
                <span
                  key={selected ? "on" : "off"}
                  className={cn("flex", selected && "animate-pop")}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {statusLabel(value)}
              </button>
            );
          })}
        </div>

        {status ? (
          <div key="fields" className="animate-rise">
            <div className="flex flex-col gap-4 pt-1 pb-1">
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
                      settings.phoneMode === "optional"
                        ? tCommon("optional").toLowerCase()
                        : undefined
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
                <div className="flex flex-col gap-2">
                  <Label id={plusLabelId}>{t("plusOnes")}</Label>
                  <div
                    role="radiogroup"
                    aria-labelledby={plusLabelId}
                    className="flex flex-wrap gap-2"
                  >
                    {plusOneOptions.map((count, index) => {
                      const selected = plusOnes === count;
                      return (
                        // biome-ignore lint/a11y/useSemanticElements: chip buttons are faster to tap than a select
                        <button
                          key={count}
                          ref={(element) => {
                            plusRadio.refs.current[index] = element;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={plusRadio.tabIndex(count, index)}
                          onClick={() => selectPlusOnes(count)}
                          onKeyDown={(event) => plusRadio.onKeyDown(event, index)}
                          className={cn(
                            "invite-focus h-11 min-w-11 rounded-full px-4 font-semibold text-sm transition-[background-color,color,transform] duration-200 active:scale-95",
                            selected
                              ? "bg-invite-accent text-invite-accent-fg shadow-sm"
                              : "invite-chip hover:brightness-[0.97]",
                          )}
                        >
                          {count === 0 ? t("plusOnesNone") : t("plusOnesCount", { count })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {settings.questions.map((question) => {
                const id = `rsvp-q-${question.id}`;
                const error = (
                  errors.answers as Record<string, { message?: string }> | undefined
                )?.[question.id];
                return (
                  <div key={question.id} className="flex flex-col gap-1.5">
                    <Label
                      htmlFor={id}
                      optional={question.required ? undefined : tCommon("optional").toLowerCase()}
                    >
                      {question.label}
                    </Label>
                    {question.type === "choice" ? (
                      <select
                        id={id}
                        className={cn(inputClass, "appearance-auto")}
                        {...register(`answers.${question.id}`)}
                      >
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
                    className={cn(inputClass, "h-auto min-h-20 resize-none py-3")}
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
                <p className="text-invite-muted text-xs leading-relaxed">{t("emailHint")}</p>
                <ErrorText>{translateError(errors.email?.message)}</ErrorText>
              </div>

              <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />

              {formError ? (
                <p
                  role="alert"
                  className={cn(
                    errorClass,
                    "rounded-2xl bg-[color-mix(in_oklab,#e5484d_12%,transparent)] px-4 py-3",
                  )}
                >
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="invite-focus flex h-14 items-center justify-center gap-2 rounded-2xl bg-invite-accent font-semibold text-base text-invite-accent-fg shadow-lg transition-[filter,opacity,transform] duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
              >
                {pending ? <Spinner /> : null}
                {pending ? t("submitting") : existing ? t("update") : t("submit")}
              </button>
              <p className="text-center text-invite-muted text-xs">{t("privacyNote")}</p>
            </div>
          </div>
        ) : null}
      </form>
    );
  }

  return content;
}
