"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { isBotCheckError, TURNSTILE_HEADER } from "@/lib/turnstile-header";

const forgotSchema = z.object({ email: z.email({ message: "rsvp.emailInvalid" }) });

export function ForgotPasswordForm({ turnstileSiteKey }: { turnstileSiteKey: string | undefined }) {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
      fetchOptions: { headers: turnstileToken ? { [TURNSTILE_HEADER]: turnstileToken } : {} },
    });
    if (isBotCheckError(error?.code)) {
      form.setError("email", { message: "errors.bot_check_failed" });
      return;
    }
    // Always show the same message so nobody can probe which emails have accounts.
    setSent(true);
  });

  if (sent) {
    return (
      <Alert>
        <AlertDescription>{t("forgotSent")}</AlertDescription>
      </Alert>
    );
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-5">
      <Field data-invalid={Boolean(errors.email)}>
        <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...form.register("email")}
        />
        <FieldError>{translateError(errors.email?.message)}</FieldError>
      </Field>
      <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : null}
        {t("forgotButton")}
      </Button>
    </form>
  );
}

const resetSchema = z.object({
  password: z.string().min(8, { message: "auth.passwordHint" }).max(128),
});

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"idle" | "done" | "invalid">(
    token && !params.get("error") ? "idle" : "invalid",
  );
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) return setStatus("invalid");
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setStatus(error ? "invalid" : "done");
  });

  if (status !== "idle") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant={status === "invalid" ? "destructive" : "default"}>
          <AlertDescription>
            {status === "done" ? t("resetDone") : t("resetInvalid")}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href={status === "done" ? "/login" : "/forgot-password"}>
            {status === "done" ? t("signInButton") : t("forgotButton")}
          </Link>
        </Button>
      </div>
    );
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-5">
      <Field data-invalid={Boolean(errors.password)}>
        <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...form.register("password")}
        />
        <FieldError>{translateError(errors.password?.message)}</FieldError>
      </Field>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : null}
        {t("resetButton")}
      </Button>
    </form>
  );
}
