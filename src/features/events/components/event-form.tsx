"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Eye, Globe, HelpCircle, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { Controller, type FieldPath, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LIMITS } from "@/config/limits";
import { SITE } from "@/config/site";
import type { ActionResult } from "@/lib/result";
import { cn } from "@/lib/utils";
import {
  createEventAction,
  removeCoverAction,
  updateEventAction,
  uploadCoverAction,
} from "../actions";
import { type EventFormInput, eventFormSchema, THEMES, type ThemeId } from "../schema";
import { CoverPicker } from "./cover-picker";
import { CustomQuestionsField } from "./custom-questions-field";
import { InvitePreview } from "./invite-preview";
import { ThemePicker } from "./theme-picker";

type EventFormProps =
  | { mode: "create"; defaultValues: EventFormInput }
  | {
      mode: "edit";
      eventId: string;
      defaultValues: EventFormInput;
      coverUrl: string | null;
      updateEmailsRemaining: number;
    };

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base shadow-xs outline-none transition-colors hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_12%)] focus-visible:border-brand-500 focus-visible:ring-4 focus-visible:ring-brand-500/15 sm:h-10 md:text-sm";

const optionCardClass =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-input has-data-checked:border-brand-500 has-data-checked:bg-brand-50/60";

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700 text-sm">
          {step}
        </span>
        <span className="heading text-lg">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** An optional section that stays collapsed (with a one-line summary) until opened. */
function OptionalSection({
  title,
  summary,
  forceOpen,
  children,
}: {
  title: string;
  summary: string;
  forceOpen: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("eventForm");
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open || forceOpen}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-3xl border bg-card shadow-xs [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-3xl p-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-6">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="heading text-lg">{title}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
              {t("optionalSection")}
            </span>
          </span>
          <span className="truncate text-muted-foreground text-sm">{summary}</span>
        </span>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">{children}</div>
    </details>
  );
}

function useTimeZones(): string[] {
  return useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC"];
    }
  }, []);
}

/** Create and edit form for events. Validation is shared with the server (../schema). */
export function EventForm(props: EventFormProps) {
  const t = useTranslations("eventForm");
  const tCommon = useTranslations("common");
  const translateError = useTranslateError();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZones = useTimeZones();
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState(props.mode === "edit" ? props.coverUrl : null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [notifyGuests, setNotifyGuests] = useState(true);

  // A quick-start link (/dashboard/events/new?theme=wild) preselects the theme.
  const [initialValues] = useState<EventFormInput>(() => {
    const requested = searchParams.get("theme");
    return props.mode === "create" && THEMES.includes(requested as ThemeId)
      ? { ...props.defaultValues, theme: requested as ThemeId }
      : props.defaultValues;
  });

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { control, register, formState, setValue, setError } = form;
  const { errors } = formState;

  // New events default to the host's own time zone.
  useEffect(() => {
    if (props.mode === "create" && !form.getValues("timezone")) {
      setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [props.mode, form, setValue]);

  const watched = useWatch({ control });
  const locationType = watched.locationType ?? "physical";
  const allowPlusOnes = watched.allowPlusOnes ?? false;
  const description = watched.description ?? "";
  const timezone = watched.timezone ?? "";

  const previewValues = {
    title: watched.title ?? "",
    hostName: watched.hostName ?? "",
    description,
    startsAt: watched.startsAt ?? "",
    endsAt: watched.endsAt ?? "",
    timezone,
    locationType,
    locationName: watched.locationName ?? "",
    locationAddress: watched.locationAddress ?? "",
    theme: watched.theme ?? "confetti",
  };

  const phoneModeLabel = (mode: EventFormInput["phoneMode"] | undefined) =>
    mode === "required"
      ? t("phoneRequired")
      : mode === "hidden"
        ? t("phoneHidden")
        : t("phoneOptional");
  const visibilityLabel = (visibility: EventFormInput["guestListVisibility"] | undefined) =>
    visibility === "names"
      ? t("visibilityNames")
      : visibility === "hidden"
        ? t("visibilityHidden")
        : t("visibilityCount");

  const guestFormSummary = [
    t("summaryPhone", { mode: phoneModeLabel(watched.phoneMode) }),
    watched.allowMessage ? t("summaryMessagesOn") : t("summaryMessagesOff"),
    allowPlusOnes
      ? t("summaryPlusOnesOn", { count: watched.maxPlusOnes ?? 1 })
      : t("summaryPlusOnesOff"),
    t("summaryQuestions", { count: watched.customQuestions?.length ?? 0 }),
    ...(watched.reminderEnabled === false ? [t("summaryReminderOff")] : []),
  ].join(" · ");
  const linkSummary = [
    watched.slug ? `${SITE.domain}/${watched.slug}` : t("summaryAutoLink"),
    watched.rsvpDeadline ? t("summaryDeadline") : t("summaryNoDeadline"),
  ].join(" · ");

  function applyServerErrors(result: ActionResult<unknown>) {
    if (result.ok) return;
    for (const [path, message] of Object.entries(result.error.fieldErrors ?? {})) {
      setError(path.replace(/^values\./, "") as FieldPath<EventFormInput>, { message });
    }
    toast.error(result.error.message);
  }

  async function uploadCover(eventId: string, file: File): Promise<boolean> {
    const data = new FormData();
    data.set("eventId", eventId);
    data.set("file", file);
    const result = await uploadCoverAction(data);
    if (!result.ok) toast.error(result.error.message);
    return result.ok;
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (props.mode === "create") {
        const result = await createEventAction(values);
        if (!result.ok) return applyServerErrors(result);
        if (coverFile) await uploadCover(result.data.id, coverFile);
        toast.success(t("created"));
        router.push(`/dashboard/events/${result.data.id}?created=1`);
        return;
      }
      const result = await updateEventAction({ eventId: props.eventId, values, notifyGuests });
      if (!result.ok) return applyServerErrors(result);
      toast.success(t("saved"));
      router.push(`/dashboard/events/${props.eventId}`);
    });
  });

  async function handleCoverChange(file: File | null) {
    if (props.mode === "create") {
      setCoverFile(file);
      return;
    }
    if (!file) return;
    setCoverBusy(true);
    setCoverFile(file);
    const ok = await uploadCover(props.eventId, file);
    setCoverBusy(false);
    if (!ok) setCoverFile(null);
  }

  async function handleCoverRemove() {
    if (props.mode !== "edit") return;
    setCoverBusy(true);
    const result = await removeCoverAction(props.eventId);
    setCoverBusy(false);
    if (result.ok) setCoverUrl(null);
    else toast.error(result.error.message);
  }

  const err = (message: string | undefined) => translateError(message);
  const preview = (
    <InvitePreview
      values={previewValues}
      coverFile={coverFile}
      coverUrl={coverUrl}
      className="rounded-[2rem]"
    />
  );

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Section step={1} title={t("sectionBasics")}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
              <Input id="title" placeholder={t("titlePlaceholder")} {...register("title")} />
              <FieldError>{err(errors.title?.message)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.hostName)}>
              <FieldLabel htmlFor="hostName">{t("hostName")}</FieldLabel>
              <Input
                id="hostName"
                placeholder={t("hostNamePlaceholder")}
                {...register("hostName")}
              />
              <FieldError>{err(errors.hostName?.message)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="description">{t("description")}</FieldLabel>
              <Textarea
                id="description"
                rows={4}
                maxLength={LIMITS.descriptionMaxLength}
                placeholder={t("descriptionPlaceholder")}
                {...register("description")}
              />
              <FieldDescription className="text-end tabular-nums">
                {t("charactersLeft", { count: LIMITS.descriptionMaxLength - description.length })}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </Section>

        <Section step={2} title={t("sectionWhen")}>
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.startsAt)}>
              <FieldLabel htmlFor="startsAt">{t("startsAt")}</FieldLabel>
              <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
              <FieldError>{err(errors.startsAt?.message)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.endsAt)}>
              <FieldLabel htmlFor="endsAt">
                {t("endsAt")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({tCommon("optional").toLowerCase()})
                </span>
              </FieldLabel>
              <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
              <FieldError>{err(errors.endsAt?.message)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.timezone)} className="sm:col-span-2">
              <FieldLabel htmlFor="timezone">{t("timezone")}</FieldLabel>
              <select id="timezone" className={selectClass} {...register("timezone")}>
                {timezone && !timeZones.includes(timezone) ? (
                  <option value={timezone}>{timezone}</option>
                ) : null}
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              {errors.timezone ? (
                <FieldError>{err(errors.timezone.message)}</FieldError>
              ) : (
                <FieldDescription>{t("timezoneHint")}</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </Section>

        <Section step={3} title={t("sectionWhere")}>
          <Controller
            control={control}
            name="locationType"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                variant="outline"
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
                className="grid w-full grid-cols-3"
                aria-label={t("locationType")}
              >
                <ToggleGroupItem
                  value="physical"
                  className="data-[state=on]:border-brand-500 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-800"
                >
                  <MapPin /> {t("locationPhysical")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="online"
                  className="data-[state=on]:border-brand-500 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-800"
                >
                  <Globe /> {t("locationOnline")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="tbd"
                  className="data-[state=on]:border-brand-500 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-800"
                >
                  <HelpCircle /> {t("locationTbd")}
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
          {locationType === "physical" ? (
            <FieldGroup className="animate-pop">
              <Field data-invalid={Boolean(errors.locationName)}>
                <FieldLabel htmlFor="locationName">{t("locationName")}</FieldLabel>
                <Input
                  id="locationName"
                  placeholder={t("locationNamePlaceholder")}
                  {...register("locationName")}
                />
              </Field>
              <Field data-invalid={Boolean(errors.locationAddress)}>
                <FieldLabel htmlFor="locationAddress">{t("locationAddress")}</FieldLabel>
                <Input
                  id="locationAddress"
                  placeholder={t("locationAddressPlaceholder")}
                  {...register("locationAddress")}
                />
              </Field>
            </FieldGroup>
          ) : null}
          {locationType === "online" ? (
            <Field data-invalid={Boolean(errors.onlineUrl)} className="animate-pop">
              <FieldLabel htmlFor="onlineUrl">{t("onlineUrl")}</FieldLabel>
              <Input
                id="onlineUrl"
                type="url"
                inputMode="url"
                placeholder={t("onlineUrlPlaceholder")}
                {...register("onlineUrl")}
              />
              <FieldError>{err(errors.onlineUrl?.message)}</FieldError>
            </Field>
          ) : null}
        </Section>

        <Section step={4} title={t("sectionLook")}>
          <Field>
            <FieldLabel>{t("theme")}</FieldLabel>
            <Controller
              control={control}
              name="theme"
              render={({ field }) => (
                <ThemePicker
                  value={field.value}
                  onChange={field.onChange}
                  previewTitle={watched.title?.trim() || undefined}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel>{t("cover")}</FieldLabel>
            <CoverPicker
              currentUrl={coverUrl}
              file={coverFile}
              onFileChange={handleCoverChange}
              onRemoveCurrent={handleCoverRemove}
              busy={coverBusy}
            />
          </Field>
        </Section>

        <OptionalSection
          title={t("sectionGuestForm")}
          summary={guestFormSummary}
          forceOpen={Boolean(errors.customQuestions || errors.maxPlusOnes)}
        >
          <Field>
            <FieldLabel>{t("phoneMode")}</FieldLabel>
            <Controller
              control={control}
              name="phoneMode"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {(["required", "optional", "hidden"] as const).map((mode) => (
                    <label key={mode} className={optionCardClass}>
                      <RadioGroupItem value={mode} />
                      {phoneModeLabel(mode)}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </Field>
          <div className="flex flex-col divide-y rounded-2xl border">
            <Controller
              control={control}
              name="allowMessage"
              render={({ field }) => (
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 text-sm">
                  {t("allowMessage")}
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
            <Controller
              control={control}
              name="allowPlusOnes"
              render={({ field }) => (
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 text-sm">
                  {t("allowPlusOnes")}
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked && form.getValues("maxPlusOnes") < 1) setValue("maxPlusOnes", 1);
                    }}
                  />
                </label>
              )}
            />
            {allowPlusOnes ? (
              <Controller
                control={control}
                name="maxPlusOnes"
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="min-h-14 animate-pop justify-between px-4 py-2"
                  >
                    <FieldLabel>{t("maxPlusOnes")}</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger className="w-24" aria-label={t("maxPlusOnes")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: LIMITS.maxPlusOnesPerGuest }, (_, i) => i + 1).map(
                          (n) => (
                            <SelectItem key={n} value={String(n)}>
                              +{n}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}
            <Controller
              control={control}
              name="reminderEnabled"
              render={({ field }) => (
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm">
                  {t("reminderEnabled")}
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </div>
          <Field>
            <FieldLabel>{t("customQuestions")}</FieldLabel>
            <FieldDescription>
              {t("customQuestionsHint", { max: LIMITS.customQuestionsPerEvent })}
            </FieldDescription>
            <CustomQuestionsField
              control={control}
              register={register}
              setValue={setValue}
              errors={errors.customQuestions as never}
            />
          </Field>
        </OptionalSection>

        <OptionalSection
          title={t("sectionPrivacy")}
          summary={visibilityLabel(watched.guestListVisibility)}
          forceOpen={Boolean(errors.guestListVisibility)}
        >
          <Field>
            <FieldLabel>{t("guestListVisibility")}</FieldLabel>
            <Controller
              control={control}
              name="guestListVisibility"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-2"
                >
                  {(["names", "count", "hidden"] as const).map((visibility) => (
                    <label key={visibility} className={optionCardClass}>
                      <RadioGroupItem value={visibility} />
                      {visibilityLabel(visibility)}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </Field>
        </OptionalSection>

        <OptionalSection
          title={t("sectionLink")}
          summary={linkSummary}
          forceOpen={Boolean(errors.slug || errors.rsvpDeadline)}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.slug)}>
              <FieldLabel htmlFor="slug">{t("slug")}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{SITE.domain}/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="slug"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="linas-bday"
                  {...register("slug")}
                />
              </InputGroup>
              {errors.slug ? (
                <FieldError>{err(errors.slug.message)}</FieldError>
              ) : (
                <FieldDescription>{t("slugHint")}</FieldDescription>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.rsvpDeadline)}>
              <FieldLabel htmlFor="rsvpDeadline">{t("rsvpDeadline")}</FieldLabel>
              <Input id="rsvpDeadline" type="datetime-local" {...register("rsvpDeadline")} />
              {errors.rsvpDeadline ? (
                <FieldError>{err(errors.rsvpDeadline.message)}</FieldError>
              ) : (
                <FieldDescription>{t("rsvpDeadlineHint")}</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </OptionalSection>

        {props.mode === "edit" ? (
          <div className="flex items-start gap-3 rounded-3xl border bg-brand-50/50 p-5">
            <Checkbox
              id="notifyGuests"
              checked={notifyGuests && props.updateEmailsRemaining > 0}
              disabled={props.updateEmailsRemaining === 0}
              onCheckedChange={(checked) => setNotifyGuests(checked === true)}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="notifyGuests" className="font-semibold text-sm">
                {t("notifyGuests")}
              </label>
              <p className="text-muted-foreground text-sm">
                {props.updateEmailsRemaining > 0
                  ? t("notifyGuestsHint", {
                      remaining: props.updateEmailsRemaining,
                      max: LIMITS.updateEmailsPerEvent,
                    })
                  : t("notifyGuestsNoneLeft", { max: LIMITS.updateEmailsPerEvent })}
              </p>
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-3 z-20 flex items-center gap-2 rounded-2xl border bg-background/85 p-2 shadow-lg backdrop-blur-xl lg:justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="lg" className="lg:hidden">
                <Eye aria-hidden="true" />
                {t("previewOpen")}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[2rem] p-0"
            >
              <SheetHeader className="px-5 pt-5 pb-3">
                <SheetTitle className="heading text-lg">{t("previewTitle")}</SheetTitle>
                <SheetDescription>{t("previewHint")}</SheetDescription>
              </SheetHeader>
              <div className="px-3 pb-6">{preview}</div>
            </SheetContent>
          </Sheet>
          <Button type="submit" size="lg" disabled={pending} className="flex-1 lg:flex-none">
            {pending ? <Spinner /> : null}
            {props.mode === "create" ? t("submitCreate") : t("submitEdit")}
          </Button>
        </div>
      </div>

      <aside className="sticky top-24 hidden flex-col gap-3 lg:flex" aria-label={t("previewTitle")}>
        <div className="flex items-center justify-between px-1">
          <p className="flex items-center gap-2 font-semibold text-sm">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand-500" />
              <span className="relative size-2 rounded-full bg-brand-500" />
            </span>
            {t("previewTitle")}
          </p>
          <p className="text-muted-foreground text-xs">{t("previewHint")}</p>
        </div>
        {/* Focusable so keyboard users can scroll the preview too (WCAG 2.1.1). */}
        <section
          aria-label={t("previewTitle")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable
          tabIndex={0}
          className={cn(
            "max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-[2rem] shadow-xl ring-1 ring-black/5 [scrollbar-width:none]",
          )}
        >
          {preview}
        </section>
      </aside>
    </form>
  );
}
