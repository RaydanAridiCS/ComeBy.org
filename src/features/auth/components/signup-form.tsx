"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FIELD_LIMITS } from "@/config/limits";
import { signUp } from "@/lib/auth-client";
import { safeNext } from "../safe-next";
import { GoogleButton } from "./google-button";

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "rsvp.nameRequired" })
    .max(FIELD_LIMITS.hostNameMaxLength, { message: "errors.validation" }),
  email: z.email({ message: "rsvp.emailInvalid" }),
  password: z.string().min(8, { message: "auth.passwordHint" }).max(128),
});
type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signUp.email({ ...values, callbackURL: next });
    if (!error) {
      setSentTo(values.email);
      return;
    }
    if (error.code?.startsWith("USER_ALREADY_EXISTS")) setFormError(t("emailTaken"));
    else if (error.code === "TOO_MANY_SIGNUPS") setFormError(t("tooManySignups"));
    else if (error.status === 429) setFormError(translateError("errors.rate_limited") ?? null);
    else setFormError(translateError("errors.generic") ?? null);
  });

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="size-10 text-brand" aria-hidden="true" />
        <h2 className="font-semibold text-xl">{t("checkEmailTitle")}</h2>
        <p className="text-muted-foreground">{t("checkEmailBody", { email: sentTo })}</p>
      </div>
    );
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <GoogleButton next={next} />
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          <FieldError>{translateError(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldError>{translateError(errors.email?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          {errors.password ? (
            <FieldError>{translateError(errors.password.message)}</FieldError>
          ) : (
            <FieldDescription>{t("passwordHint")}</FieldDescription>
          )}
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Spinner /> : null}
        {t("signUpButton")}
      </Button>
      <p className="text-center text-muted-foreground text-xs">
        {t.rich("ageNotice", {
          terms: (chunks) => (
            <Link href="/terms" className="underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="text-center text-muted-foreground text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          {t("signInButton")}
        </Link>
      </p>
    </form>
  );
}
