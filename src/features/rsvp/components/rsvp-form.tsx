"use client";

import { Check, HelpCircle, type LucideIcon, Pencil, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Controller,
  type DefaultValues,
  type FieldPath,
  type Resolver,
  useForm,
  useWatch,
} from "react-hook-form";
import type { Country } from "react-phone-number-input";
import { fieldA11y } from "@/components/forms/field-a11y";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useRovingRadio } from "@/components/forms/use-roving-radio";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/config/limits";
import type { CustomQuestion } from "@/db/schema";
import { cn } from "@/lib/utils";
import { submitRsvpAction } from "../actions";
import type { RsvpFormInput, RsvpStatusValue } from "../schema";
import { GuestDataControls } from "./guest-data-controls";
import { invitePrimaryButton, inviteSecondaryButton } from "./invite-buttons";
import { RsvpJumpBar } from "./rsvp-jump-bar";

export type RsvpEventSettings = {
  eventId: string;
  hostName: string;
  /** The event's day and time, for the bar that points to the form. */
  dateLabel: string;
  phoneMode: "required" | "optional" | "hidden";
  allowMessage: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  questions: CustomQuestion[];
  /** The theme's confetti colours for the "You're in!" burst. */
  confettiColors: string[];
};

type SavedResponse = RsvpFormInput & { status: RsvpStatusValue };

const EMPTY_RESPONSE: DefaultValues<RsvpFormInput> = {
  status: undefined,
  name: "",
  phone: "",
  email: "",
  message: "",
  plusOnes: 0,
  answers: {},
};

type Props = {
  settings: RsvpEventSettings;
  existing: SavedResponse | null;
  turnstileSiteKey: string | undefined;
  /** Rendered with the success message and the "your response" summary (add-to-calendar). */
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

/** A field's error. `role="alert"` makes a screen reader say it when it appears. */
function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={errorClass}>
      {children}
    </p>
  );
}

/** The radio a roving group lets Tab reach: the chosen one, or the first. */
function focusableOption(group: HTMLElement | null) {
  return group?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? null;
}

/** The guest's response form: tap a status, type a name, done. */
export function RsvpForm({ settings, existing, turnstileSiteKey, afterSuccess }: Props) {
  const t = useTranslations("rsvp");
  const tCommon = useTranslations("common");
  const translateError = useTranslateError();
  const plusLabelId = useId();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"form" | "summary" | "done" | "deleted">(
    existing ? "summary" : "form",
  );
  const [submitted, setSubmitted] = useState<{ status: RsvpStatusValue; emailed: boolean } | null>(
    null,
  );
  // The response as the server has it: from an earlier visit, or the one just sent.
  const [saved, setSaved] = useState<SavedResponse | null>(existing);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [country] = useState(guessCountry);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const form = useForm<RsvpFormInput>({
    resolver: lazyResolver,
    defaultValues: existing ?? EMPTY_RESPONSE,
    // Focus is handled below, so it also works for the phone field and for server errors.
    shouldFocusError: false,
  });
  const { control, register, formState, setError, setValue } = form;
  const { errors } = formState;
  const formRef = useRef<HTMLFormElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  // Where focus goes once the next view has rendered.
  const focusNext = useRef<"picker" | "change" | null>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const nameField = fieldA11y("rsvp-name", { invalid: Boolean(errors.name) });
  const phoneField = fieldA11y("rsvp-phone", { invalid: Boolean(errors.phone) });
  const emailField = fieldA11y("rsvp-email", { invalid: Boolean(errors.email), hint: true });
  const status = useWatch({ control, name: "status" });
  const plusOnes = useWatch({ control, name: "plusOnes" }) ?? 0;

  const statusLabel = (value: RsvpStatusValue) =>
    value === "going" ? t("going") : value === "maybe" ? t("maybe") : t("notGoing");
  const statusValues: RsvpStatusValue[] = ["going", "maybe", "not_going"];
  const selectStatus = (value: RsvpStatusValue) =>
    setValue("status", value, { shouldValidate: true });
  const statusRadio = useRovingRadio(statusValues, status, selectStatus);

  /** The picker's focusable option: the chosen answer, or the first one. */
  const pickerOption = () => focusableOption(pickerRef.current);

  // After each render: if a view change asked for focus, the new view is on screen now.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    if (target === "picker") focusableOption(pickerRef.current)?.focus();
    if (target === "change") changeRef.current?.focus();
  });

  const showForm = () => {
    focusNext.current = "picker";
    setView("form");
  };
  /** Back to the summary without sending anything: the form forgets any edits. */
  const keepAnswer = () => {
    if (saved) form.reset(saved);
    setFormError(null);
    focusNext.current = "change";
    setView("summary");
  };
  /** From the bar at the bottom: bring the form into view and put focus on the answers. */
  const jumpToForm = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    pickerOption()?.focus({ preventScroll: true });
  };

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
        focusFirstInvalid();
        return;
      }
      const status = result.data.status as RsvpStatusValue;
      setSubmitted({ status, emailed: result.data.emailed });
      setSaved({ ...values, status });
      form.reset({ ...values, status });
      setView("done");
    });
  }, focusFirstInvalid);

  const onDeleted = () => {
    form.reset(EMPTY_RESPONSE);
    setSubmitted(null);
    setSaved(null);
    setView("deleted");
  };

  let content: ReactNode;

  if (view === "deleted") {
    content = (
      <div key="deleted" className="flex animate-pop flex-col items-center gap-4 text-center">
        <p className="invite-heading text-xl">{t("deletedTitle")}</p>
        <p className="text-invite-muted text-sm">{t("deletedBody")}</p>
        <button type="button" className={invitePrimaryButton} onClick={showForm}>
          {t("respondAgain")}
        </button>
      </div>
    );
  } else if (view === "done" && submitted) {
    content = (
      <RsvpSuccess
        status={submitted.status}
        emailed={submitted.emailed}
        hostName={settings.hostName}
        confettiColors={settings.confettiColors}
        afterSuccess={afterSuccess}
        onChange={showForm}
      />
    );
  } else if (view === "summary" && saved) {
    const Icon = STATUS_ICONS[saved.status];
    const bringing = saved.status === "going" ? (saved.plusOnes ?? 0) : 0;
    content = (
      <div key="summary" className="flex animate-pop flex-col items-center gap-4 text-center">
        <div className="invite-chip relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-3xl px-5 py-6">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              saved.status === "going"
                ? "bg-invite-accent text-invite-accent-fg"
                : "bg-(--invite-card) text-(--invite-accent-ink)",
            )}
            aria-hidden="true"
          >
            <Icon className="size-6" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-lg">
              {t("yourResponse", { status: statusLabel(saved.status) })}
            </h2>
            {bringing > 0 ? (
              <p className="text-invite-muted text-sm">{t("yourPlusOnes", { count: bringing })}</p>
            ) : null}
          </div>
          <span className="w-full border-(--invite-card-border) border-t border-dashed" />
          <p className="text-invite-muted text-sm">
            {t("doneBody", { host: settings.hostName })}{" "}
            {saved.email ? t("changeHintEmail") : t("changeHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            ref={changeRef}
            type="button"
            className={inviteSecondaryButton}
            onClick={showForm}
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t("changeResponse")}
          </button>
          {afterSuccess}
        </div>
      </div>
    );
  } else {
    const going = status === "going";
    const changing = saved !== null;
    content = (
      <form
        key="form"
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="flex scroll-mt-4 flex-col gap-5"
      >
        <h2 className="invite-heading text-center text-[1.75rem] leading-tight">
          {changing ? t("changeTitle") : t("title")}
        </h2>
        <div
          ref={pickerRef}
          role="radiogroup"
          aria-label={changing ? t("changeTitle") : t("title")}
          className="grid grid-cols-3 gap-2"
        >
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
                <Label htmlFor={nameField.control.id}>{t("name")}</Label>
                <input
                  {...nameField.control}
                  autoComplete="name"
                  className={inputClass}
                  placeholder={t("namePlaceholder")}
                  {...register("name")}
                />
                <ErrorText id={nameField.errorId}>{translateError(errors.name?.message)}</ErrorText>
              </div>

              {settings.phoneMode !== "hidden" ? (
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={phoneField.control.id}
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
                        {...phoneField.control}
                        autoComplete="tel"
                        className={inputClass}
                        defaultCountry={country}
                        international={!country}
                        withCountryCallingCode={!country}
                        value={field.value || undefined}
                        onChange={(value) => field.onChange(value ?? "")}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <ErrorText id={phoneField.errorId}>
                    {translateError(errors.phone?.message)}
                  </ErrorText>
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
                const error = (
                  errors.answers as Record<string, { message?: string }> | undefined
                )?.[question.id];
                const answerField = fieldA11y(`rsvp-q-${question.id}`, {
                  invalid: Boolean(error),
                });
                return (
                  <div key={question.id} className="flex flex-col gap-1.5">
                    <Label
                      htmlFor={answerField.control.id}
                      optional={question.required ? undefined : tCommon("optional").toLowerCase()}
                    >
                      {question.label}
                    </Label>
                    {question.type === "choice" ? (
                      <select
                        {...answerField.control}
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
                        {...answerField.control}
                        className={inputClass}
                        maxLength={300}
                        {...register(`answers.${question.id}`)}
                      />
                    )}
                    <ErrorText id={answerField.errorId}>{translateError(error?.message)}</ErrorText>
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
                <Label htmlFor={emailField.control.id} optional={tCommon("optional").toLowerCase()}>
                  {t("email")}
                </Label>
                <input
                  {...emailField.control}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass}
                  {...register("email")}
                />
                {/* The error sits right under the field; the longer hint comes after it. */}
                <ErrorText id={emailField.errorId}>
                  {translateError(errors.email?.message)}
                </ErrorText>
                <p id={emailField.hintId} className="text-invite-muted text-xs leading-relaxed">
                  {t("emailHint")}
                </p>
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
                {pending ? t("submitting") : changing ? t("update") : t("submit")}
              </button>
              {changing ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={keepAnswer}
                  className={cn(inviteSecondaryButton, "self-center disabled:opacity-70")}
                >
                  {t("keepAnswer")}
                </button>
              ) : null}
              <p className="text-center text-invite-muted text-xs">{t("privacyNote")}</p>
            </div>
          </div>
        ) : null}
      </form>
    );
  }

  return (
    <>
      {content}
      {/* Only for someone who hasn't answered yet: a guest who has knows where the form is. */}
      {view === "form" && !saved ? (
        <RsvpJumpBar target={pickerRef} dateLabel={settings.dateLabel} onJump={jumpToForm} />
      ) : null}
      {saved && view !== "deleted" ? (
        <GuestDataControls eventId={settings.eventId} onDeleted={onDeleted} />
      ) : null}
    </>
  );
}
