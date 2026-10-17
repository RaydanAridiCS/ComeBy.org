"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, HelpCircle, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LIMITS } from "@/config/limits";
import { SITE } from "@/config/site";
import type { ActionResult } from "@/lib/result";
import {
  createEventAction,
  removeCoverAction,
  updateEventAction,
  uploadCoverAction,
} from "../actions";
import { type EventFormInput, eventFormSchema } from "../schema";
import { CoverPicker } from "./cover-picker";
import { CustomQuestionsField } from "./custom-questions-field";
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </section>
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
  const timeZones = useTimeZones();
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState(props.mode === "edit" ? props.coverUrl : null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [notifyGuests, setNotifyGuests] = useState(true);

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: props.defaultValues,
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

  const locationType = useWatch({ control, name: "locationType" });
  const allowPlusOnes = useWatch({ control, name: "allowPlusOnes" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const timezone = useWatch({ control, name: "timezone" });

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

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Section title={t("sectionBasics")}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
            <Input id="title" placeholder={t("titlePlaceholder")} {...register("title")} />
            <FieldError>{err(errors.title?.message)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.hostName)}>
            <FieldLabel htmlFor="hostName">{t("hostName")}</FieldLabel>
            <Input id="hostName" placeholder={t("hostNamePlaceholder")} {...register("hostName")} />
            <FieldError>{err(errors.hostName?.message)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="description">{t("description")}</FieldLabel>
            <Textarea
              id="description"
              rows={5}
              maxLength={LIMITS.descriptionMaxLength}
              placeholder={t("descriptionPlaceholder")}
              {...register("description")}
            />
            <FieldDescription>
              {t("charactersLeft", { count: LIMITS.descriptionMaxLength - description.length })}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </Section>

      <Section title={t("sectionWhen")}>
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
            <select
              id="timezone"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...register("timezone")}
            >
              {timezone && !timeZones.includes(timezone) ? (
                <option value={timezone}>{timezone}</option>
              ) : null}
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <FieldError>{err(errors.timezone?.message)}</FieldError>
          </Field>
        </FieldGroup>
      </Section>

      <Section title={t("sectionWhere")}>
        <Controller
          control={control}
          name="locationType"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
              className="w-full sm:w-auto"
              aria-label={t("locationType")}
            >
              <ToggleGroupItem value="physical" className="flex-1">
                <MapPin /> {t("locationPhysical")}
              </ToggleGroupItem>
              <ToggleGroupItem value="online" className="flex-1">
                <Globe /> {t("locationOnline")}
              </ToggleGroupItem>
              <ToggleGroupItem value="tbd" className="flex-1">
                <HelpCircle /> {t("locationTbd")}
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        />
        {locationType === "physical" ? (
          <FieldGroup>
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
          <Field data-invalid={Boolean(errors.onlineUrl)}>
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

      <Section title={t("sectionLook")}>
        <Field>
          <FieldLabel>{t("theme")}</FieldLabel>
          <Controller
            control={control}
            name="theme"
            render={({ field }) => <ThemePicker value={field.value} onChange={field.onChange} />}
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

      <Section title={t("sectionGuestForm")}>
        <Field>
          <FieldLabel>{t("phoneMode")}</FieldLabel>
          <Controller
            control={control}
            name="phoneMode"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-wrap gap-4"
              >
                {(["required", "optional", "hidden"] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={mode} />
                    {t(
                      mode === "required"
                        ? "phoneRequired"
                        : mode === "optional"
                          ? "phoneOptional"
                          : "phoneHidden",
                    )}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </Field>
        <Controller
          control={control}
          name="allowMessage"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 text-sm">
              {t("allowMessage")}
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
        <Controller
          control={control}
          name="allowPlusOnes"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-4 text-sm">
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
              <Field orientation="horizontal" className="justify-between">
                <FieldLabel>{t("maxPlusOnes")}</FieldLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger className="w-24">
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
      </Section>

      <Section title={t("sectionPrivacy")}>
        <Field>
          <FieldLabel>{t("guestListVisibility")}</FieldLabel>
          <Controller
            control={control}
            name="guestListVisibility"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange}>
                {(["names", "count", "hidden"] as const).map((visibility) => (
                  <label key={visibility} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={visibility} />
                    {t(
                      visibility === "names"
                        ? "visibilityNames"
                        : visibility === "count"
                          ? "visibilityCount"
                          : "visibilityHidden",
                    )}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </Field>
      </Section>

      <Section title={t("sectionLink")}>
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
      </Section>

      {props.mode === "edit" ? (
        <div className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-4">
          <Checkbox
            id="notifyGuests"
            checked={notifyGuests && props.updateEmailsRemaining > 0}
            disabled={props.updateEmailsRemaining === 0}
            onCheckedChange={(checked) => setNotifyGuests(checked === true)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="notifyGuests" className="font-medium text-sm">
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

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="rounded-full shadow-lg">
          {pending ? <Spinner /> : null}
          {props.mode === "create" ? t("submitCreate") : t("submitEdit")}
        </Button>
      </div>
    </form>
  );
}
