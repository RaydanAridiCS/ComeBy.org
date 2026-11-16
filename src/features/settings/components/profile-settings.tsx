"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fieldA11y } from "@/components/forms/field-a11y";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FIELD_LIMITS } from "@/config/limits";
import { authClient } from "@/lib/auth-client";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "auth.nameRequired" })
    .max(FIELD_LIMITS.hostNameMaxLength, { message: "auth.nameTooLong" }),
});

const emailSchema = z.object({ newEmail: z.email({ message: "auth.emailInvalid" }) });

function NameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("settings");
  const translateError = useTranslateError();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    const { error } = await authClient.updateUser({ name });
    if (error) {
      toast.error(translateError("errors.generic") ?? null);
      return;
    }
    toast.success(t("nameSaved"));
    router.refresh();
  }, focusFirstInvalid);

  const { errors, isSubmitting } = form.formState;
  const name = fieldA11y("profile-name", { invalid: Boolean(errors.name), hint: true });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-3"
    >
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="profile-name">{t("name")}</FieldLabel>
        <Input {...name.control} autoComplete="name" {...form.register("name")} />
        <FieldError id={name.errorId}>{translateError(errors.name?.message)}</FieldError>
        <FieldDescription id={name.hintId}>{t("nameHint")}</FieldDescription>
      </Field>
      <Button type="submit" size="sm" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : null}
        {t("saveName")}
      </Button>
    </form>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const t = useTranslations("settings");
  const translateError = useTranslateError();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: "" },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async ({ newEmail }) => {
    setFormError(null);
    setSent(false);
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      form.setError("newEmail", { message: "settings.emailSame" });
      focusFirstInvalid();
      return;
    }
    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/dashboard/settings",
    });
    if (error) {
      setFormError(
        error.status === 429
          ? (translateError("errors.rate_limited") ?? null)
          : (translateError("errors.generic") ?? null),
      );
      return;
    }
    // The same message whether or not the address is taken, so nobody can probe for accounts.
    setSent(true);
    form.reset();
  }, focusFirstInvalid);

  const { errors, isSubmitting } = form.formState;
  const newEmail = fieldA11y("profile-new-email", {
    invalid: Boolean(errors.newEmail),
    hint: true,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-3"
    >
      <Field data-invalid={Boolean(errors.newEmail)}>
        <FieldLabel htmlFor="profile-new-email">{t("newEmail")}</FieldLabel>
        <Input
          {...newEmail.control}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("newEmailPlaceholder")}
          {...form.register("newEmail")}
        />
        <FieldError id={newEmail.errorId}>{translateError(errors.newEmail?.message)}</FieldError>
        <FieldDescription id={newEmail.hintId}>
          {t("changeEmailHint", { email: currentEmail })}
        </FieldDescription>
      </Field>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {sent ? (
        <Alert>
          <AlertDescription>{t("changeEmailSent", { email: currentEmail })}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Spinner /> : null}
        {t("changeEmailButton")}
      </Button>
    </form>
  );
}

/** Display name and sign-in email. Google-only accounts keep the address Google gave us. */
export function ProfileSettings({
  name,
  email,
  canChangeEmail,
}: {
  name: string;
  email: string;
  canChangeEmail: boolean;
}) {
  const t = useTranslations("settings");
  return (
    <div className="flex flex-col gap-6">
      <NameForm initialName={name} />
      <div className="border-t pt-6">
        {canChangeEmail ? (
          <EmailForm currentEmail={email} />
        ) : (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">{t("email")}</p>
            <p className="text-muted-foreground text-sm">{email}</p>
            <p className="text-muted-foreground text-xs">{t("googleEmailHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
