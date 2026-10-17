"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "@/components/forms/password-input";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";
import { safeNext } from "../safe-next";
import { GoogleButton } from "./google-button";

const loginSchema = z.object({
  email: z.email({ message: "rsvp.emailInvalid" }),
  password: z.string().min(1, { message: "errors.validation" }),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signIn.email({ ...values, callbackURL: next });
    if (!error) {
      router.replace(next);
      router.refresh();
      return;
    }
    if (error.code === "EMAIL_NOT_VERIFIED") setFormError(t("emailNotVerified"));
    else if (error.code === "INVALID_EMAIL_OR_PASSWORD") setFormError(t("invalidCredentials"));
    else if (error.status === 429) setFormError(translateError("errors.rate_limited") ?? null);
    else setFormError(translateError("errors.generic") ?? null);
  });

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
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Link
              href="/forgot-password"
              className="font-medium text-brand-700 text-sm hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldError>{translateError(errors.password?.message)}</FieldError>
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
