"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "@/components/forms/password-input";
import { Turnstile } from "@/components/forms/turnstile";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FIELD_LIMITS } from "@/config/limits";
import { signUp } from "@/lib/auth-client";
import { isBotCheckError, TURNSTILE_HEADER } from "@/lib/turnstile-header";
import { safeNext } from "../safe-next";
import { GoogleButton } from "./google-button";
import { ResendVerification } from "./resend-verification";

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

export function SignupForm({ turnstileSiteKey }: { turnstileSiteKey: string | undefined }) {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signUp.email({
      ...values,
      callbackURL: next,
      fetchOptions: { headers: turnstileToken ? { [TURNSTILE_HEADER]: turnstileToken } : {} },
    });
    if (!error) {
      setSentTo(values.email);
      return;
    }
    if (error.code?.startsWith("USER_ALREADY_EXISTS")) setFormError(t("emailTaken"));
    else if (isBotCheckError(error.code))
      setFormError(translateError("errors.bot_check_failed") ?? null);
    else if (error.code === "TOO_MANY_SIGNUPS") setFormError(t("tooManySignups"));
    else if (error.status === 429) setFormError(translateError("errors.rate_limited") ?? null);
    else setFormError(translateError("errors.generic") ?? null);
  });

  if (sentTo) {
    return (
      <div className="flex animate-pop flex-col items-center gap-5 text-center">
        <span className="relative flex size-20 items-center justify-center rounded-[1.75rem] bg-brand-gradient text-white shadow-brand">
          <MailCheck className="size-9" aria-hidden="true" />
          <span className="absolute -end-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-success text-white ring-4 ring-background">
            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
          </span>
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="heading text-headline">{t("checkEmailTitle")}</h2>
          <p className="text-muted-foreground">{t("checkEmailBody", { email: sentTo })}</p>
        </div>
        <p className="rounded-2xl bg-muted px-4 py-3 text-muted-foreground text-sm">
          {t("checkEmailHint")}
        </p>
        <ResendVerification email={sentTo} next={next} />
      </div>
    );
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-5">
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
          <PasswordInput
            id="password"
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
      <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
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
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          {t("signInButton")}
        </Link>
      </p>
    </form>
  );
}
