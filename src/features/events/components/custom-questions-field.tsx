"use client";

import { Plus, Trash2, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useTranslations } from "next-intl";
import {
  type Control,
  Controller,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LIMITS } from "@/config/limits";
import type { EventFormInput } from "../schema";

type Errors = {
  label?: { message?: string };
  choices?: { message?: string; root?: { message?: string } };
}[];

function ChoicesEditor({
  control,
  setValue,
  index,
}: {
  control: Control<EventFormInput>;
  setValue: UseFormSetValue<EventFormInput>;
  index: number;
}) {
  const t = useTranslations("eventForm");
  const path = `customQuestions.${index}.choices` as const;
  const choices = useWatch({ control, name: path }) ?? [];
  const update = (next: string[]) => setValue(path, next, { shouldDirty: true });

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{t("questionChoices")}</FieldLabel>
      {choices.map((choice, choiceIndex) => (
        // Choices have no identity besides their position; inputs are controlled, so this is safe.
        // biome-ignore lint/suspicious/noArrayIndexKey: see comment above
        <div key={choiceIndex} className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs">
            {choiceIndex + 1}
          </span>
          <Input
            value={choice}
            aria-label={t("choicePlaceholder", { number: choiceIndex + 1 })}
            placeholder={t("choicePlaceholder", { number: choiceIndex + 1 })}
            onChange={(event) =>
              update(choices.map((value, i) => (i === choiceIndex ? event.target.value : value)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("removeChoice", { number: choiceIndex + 1 })}
            onClick={() => update(choices.filter((_, i) => i !== choiceIndex))}
          >
            <X />
          </Button>
        </div>
      ))}
      {choices.length < LIMITS.choicesPerQuestion ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => update([...choices, ""])}
        >
          <Plus />
          {t("addChoice")}
        </Button>
      ) : null}
    </div>
  );
}

/** Up to three host-defined questions (short text or multiple choice). */
export function CustomQuestionsField({
  control,
  register,
  setValue,
  errors,
}: {
  control: Control<EventFormInput>;
  register: UseFormRegister<EventFormInput>;
  setValue: UseFormSetValue<EventFormInput>;
  errors: Errors | undefined;
}) {
  const t = useTranslations("eventForm");
  const translateError = useTranslateError();
  const { fields, append, remove } = useFieldArray({ control, name: "customQuestions" });
  const questions = useWatch({ control, name: "customQuestions" }) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const type = questions[index]?.type ?? "text";
        const error = errors?.[index];
        return (
          <div
            key={field.id}
            className="flex animate-pop flex-col gap-4 rounded-2xl border bg-background p-4 shadow-xs"
          >
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.1em]">
              {t("questionNumber", { number: index + 1 })}
            </p>
            <div className="flex items-start gap-2">
              <Field data-invalid={Boolean(error?.label)} className="flex-1">
                <FieldLabel htmlFor={`q-${field.id}`}>{t("questionLabel")}</FieldLabel>
                <Input
                  id={`q-${field.id}`}
                  placeholder={t("questionLabelPlaceholder")}
                  {...register(`customQuestions.${index}.label`)}
                />
                <FieldError>{translateError(error?.label?.message)}</FieldError>
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label={t("removeQuestion")}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Controller
                control={control}
                name={`customQuestions.${index}.type`}
                render={({ field: typeField }) => (
                  <Select value={typeField.value} onValueChange={typeField.onChange}>
                    <SelectTrigger className="w-48" aria-label={t("questionType")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t("questionTypeText")}</SelectItem>
                      <SelectItem value="choice">{t("questionTypeChoice")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`customQuestions.${index}.required`}
                render={({ field: requiredField }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={requiredField.value}
                      onCheckedChange={requiredField.onChange}
                    />
                    {t("questionRequired")}
                  </label>
                )}
              />
            </div>
            {type === "choice" ? (
              <>
                <ChoicesEditor control={control} setValue={setValue} index={index} />
                <FieldError>
                  {translateError(error?.choices?.message ?? error?.choices?.root?.message)}
                </FieldError>
              </>
            ) : null}
          </div>
        );
      })}
      {fields.length < LIMITS.customQuestionsPerEvent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            append({ id: nanoid(8), label: "", type: "text", required: false, choices: ["", ""] })
          }
        >
          <Plus />
          {t("addQuestion")}
        </Button>
      ) : null}
    </div>
  );
}
