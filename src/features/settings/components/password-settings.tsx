"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordInput } from "@/components/forms/password-input";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "errors.validation" }),
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
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", signOutOthers: true },
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
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-4">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={Boolean(errors.currentPassword)}>
        <FieldLabel htmlFor="current-password">{t("currentPassword")}</FieldLabel>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...form.register("currentPassword")}
        />
        <FieldError>{translateError(errors.currentPassword?.message)}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.newPassword)}>
        <FieldLabel htmlFor="new-password">{tAuth("newPassword")}</FieldLabel>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...form.register("newPassword")}
        />
        <FieldError>{translateError(errors.newPassword?.message)}</FieldError>
      </Field>
      <Controller
        control={form.control}
        name="signOutOthers"
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
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
