"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fieldA11y } from "@/components/forms/field-a11y";
import { PasswordInput } from "@/components/forms/password-input";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";
import { safeNext } from "../safe-next";
import { GoogleButton } from "./google-button";
import { ResendVerification } from "./resend-verification";

const loginSchema = z.object({
  email: z.email({ message: "auth.emailInvalid" }),
  password: z.string().min(1, { message: "auth.passwordRequired" }),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setUnverifiedEmail(null);
    const { error } = await signIn.email({ ...values, callbackURL: next });
    if (!error) {
      router.replace(next);
      router.refresh();
      return;
    }
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setFormError(t("emailNotVerified"));
      setUnverifiedEmail(values.email);
    } else if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
      setFormError(t("invalidCredentials"));
      // The button was disabled while sending, which drops focus: put it where the fix is.
      form.setFocus("password", { shouldSelect: true });
    } else if (error.status === 429) setFormError(translateError("errors.rate_limited") ?? null);
    else setFormError(translateError("errors.generic") ?? null);
  }, focusFirstInvalid);

  const { errors, isSubmitting } = form.formState;
  const email = fieldA11y("email", { invalid: Boolean(errors.email) });
  const password = fieldA11y("password", { invalid: Boolean(errors.password) });

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-5"
    >
      <GoogleButton next={next} />
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {unverifiedEmail ? <ResendVerification email={unverifiedEmail} next={next} /> : null}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            {...email.control}
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            {...form.register("email")}
          />
          <FieldError id={email.errorId}>{translateError(errors.email?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Link
              href="/forgot-password"
              // 44 px tall to a thumb; the negative margin keeps the row from growing into the field.
              className="-my-2 inline-flex min-h-11 items-center rounded font-medium text-brand-700 text-sm hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            {...password.control}
            autoComplete="current-password"
            {...form.register("password")}
          />
          <FieldError id={password.errorId}>{translateError(errors.password?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Spinner /> : null}
        {t("signInButton")}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        {t("noAccount")}{" "}
        <Link
          href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          {t("signUpButton")}
        </Link>
      </p>
    </form>
  );
}
