"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
    .min(1, { message: "rsvp.nameRequired" })
    .max(FIELD_LIMITS.hostNameMaxLength, { message: "errors.validation" }),
});

const emailSchema = z.object({ newEmail: z.email({ message: "rsvp.emailInvalid" }) });

function NameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("settings");
  const translateError = useTranslateError();
  const router = useRouter();
  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    const { error } = await authClient.updateUser({ name });
    if (error) {
      toast.error(translateError("errors.generic") ?? null);
      return;
    }
    toast.success(t("nameSaved"));
    router.refresh();
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-3">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="profile-name">{t("name")}</FieldLabel>
        <Input
          id="profile-name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          {...form.register("name")}
        />
        <FieldDescription>{t("nameHint")}</FieldDescription>
        <FieldError>{translateError(errors.name?.message)}</FieldError>
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
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: "" },
  });

  const onSubmit = form.handleSubmit(async ({ newEmail }) => {
    setFormError(null);
    setSent(false);
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      form.setError("newEmail", { message: "settings.emailSame" });
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
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-3">
      <Field data-invalid={Boolean(errors.newEmail)}>
        <FieldLabel htmlFor="profile-new-email">{t("changeEmail")}</FieldLabel>
        <Input
          id="profile-new-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.newEmail)}
          {...form.register("newEmail")}
        />
        <FieldDescription>{t("changeEmailHint", { email: currentEmail })}</FieldDescription>
        <FieldError>{translateError(errors.newEmail?.message)}</FieldError>
      </Field>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {sent ? (
        <Alert role="status">
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
