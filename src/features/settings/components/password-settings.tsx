"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fieldA11y } from "@/components/forms/field-a11y";
import { PasswordInput } from "@/components/forms/password-input";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "settings.currentPasswordRequired" }),
  newPassword: z.string().min(8, { message: "auth.passwordHint" }).max(128),
  signOutOthers: z.boolean(),
});
type PasswordValues = z.infer<typeof passwordSchema>;

/** Change the password while signed in, optionally signing out every other device. */
export function PasswordSettings() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const translateError = useTranslateError();
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", signOutOthers: true },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: values.signOutOthers,
    });
    if (error) {
      if (error.code === "INVALID_PASSWORD") {
        form.setError("currentPassword", { message: "settings.currentPasswordWrong" });
        focusFirstInvalid();
      } else {
        setFormError(
          error.status === 429
            ? (translateError("errors.rate_limited") ?? null)
            : (translateError("errors.generic") ?? null),
        );
      }
      return;
    }
    toast.success(t("passwordChanged"));
    form.reset({ currentPassword: "", newPassword: "", signOutOthers: values.signOutOthers });
  }, focusFirstInvalid);

  const { errors, isSubmitting } = form.formState;
  const current = fieldA11y("current-password", { invalid: Boolean(errors.currentPassword) });
  const next = fieldA11y("new-password", {
    invalid: Boolean(errors.newPassword),
    hint: !errors.newPassword,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-4"
    >
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={Boolean(errors.currentPassword)}>
        <FieldLabel htmlFor="current-password">{t("currentPassword")}</FieldLabel>
        <PasswordInput
          {...current.control}
          autoComplete="current-password"
          {...form.register("currentPassword")}
        />
        <FieldError id={current.errorId}>
          {translateError(errors.currentPassword?.message)}
        </FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.newPassword)}>
        <FieldLabel htmlFor="new-password">{tAuth("newPassword")}</FieldLabel>
        <PasswordInput
          {...next.control}
          autoComplete="new-password"
          {...form.register("newPassword")}
        />
        {/* The hint and the "too short" error say the same thing: show one or the other. */}
        {errors.newPassword ? (
          <FieldError id={next.errorId}>{translateError(errors.newPassword.message)}</FieldError>
        ) : (
          <FieldDescription id={next.hintId}>{tAuth("passwordHint")}</FieldDescription>
        )}
      </Field>
      <Controller
        control={form.control}
        name="signOutOthers"
        render={({ field }) => (
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            {t("signOutOthersOption")}
          </label>
        )}
      />
      <Button type="submit" size="sm" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : null}
        {t("changePasswordButton")}
      </Button>
    </form>
  );
}
