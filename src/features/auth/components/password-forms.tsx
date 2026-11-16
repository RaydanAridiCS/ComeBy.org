"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LostEnvelope } from "@/components/brand/lost-envelope";
import { fieldA11y } from "@/components/forms/field-a11y";
import { PasswordInput } from "@/components/forms/password-input";
import { Turnstile } from "@/components/forms/turnstile";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { isBotCheckError, TURNSTILE_HEADER } from "@/lib/turnstile-header";
import { AuthStatus, MailHint, StatusTile } from "./auth-status";
import { ResendButton } from "./resend-verification";

const forgotSchema = z.object({ email: z.email({ message: "auth.emailInvalid" }) });

function requestReset(email: string, turnstileToken: string | null) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: "/reset-password",
    fetchOptions: { headers: turnstileToken ? { [TURNSTILE_HEADER]: turnstileToken } : {} },
  });
}

export function ForgotPasswordForm({ turnstileSiteKey }: { turnstileSiteKey: string | undefined }) {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // A bot-check token works once: each send gets a fresh widget, and with it a fresh token.
  const [widget, setWidget] = useState(0);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await requestReset(email, turnstileToken);
    if (isBotCheckError(error?.code)) {
      form.setError("email", { message: "errors.bot_check_failed" });
      focusFirstInvalid();
      return;
    }
    // Always the same screen, so nobody can probe which emails have accounts.
    setTurnstileToken(null);
    setWidget((current) => current + 1);
    setSentTo(email);
  }, focusFirstInvalid);

  if (sentTo) {
    return (
      <AuthStatus
        art={<StatusTile icon={MailCheck} />}
        title={t("checkEmailTitle")}
        body={t("forgotSentBody", { email: sentTo })}
      >
        <MailHint>{t("checkEmailHint")}</MailHint>
        <Turnstile key={widget} siteKey={turnstileSiteKey} onToken={onToken} />
        <ResendButton
          disabled={Boolean(turnstileSiteKey) && !turnstileToken}
          send={async () => {
            const result = await requestReset(sentTo, turnstileToken);
            setTurnstileToken(null);
            setWidget((current) => current + 1);
            return result;
          }}
        />
        <Button asChild size="lg" variant="outline" className="mt-2 w-full">
          <Link href="/login">{t("backToSignIn")}</Link>
        </Button>
      </AuthStatus>
    );
  }

  const { errors, isSubmitting } = form.formState;
  const email = fieldA11y("email", { invalid: Boolean(errors.email) });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-5"
    >
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
      <Turnstile key={widget} siteKey={turnstileSiteKey} onToken={onToken} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Spinner /> : null}
        {t("forgotButton")}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        {t("rememberedIt")}{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          {t("signInButton")}
        </Link>
      </p>
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
  // A link that is missing its token, or that Better Auth already turned away, never shows the form.
  const brokenOnArrival = !token || Boolean(params.get("error"));
  const [status, setStatus] = useState<"idle" | "done" | "invalid">(
    brokenOnArrival ? "invalid" : "idle",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "" },
    shouldFocusError: false,
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) return setStatus("invalid");
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setStatus(error ? "invalid" : "done");
  }, focusFirstInvalid);

  if (status === "done") {
    return (
      <AuthStatus
        art={<StatusTile icon={KeyRound} />}
        title={t("resetDoneTitle")}
        body={t("resetDoneBody")}
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/login">{t("signInButton")}</Link>
        </Button>
      </AuthStatus>
    );
  }

  if (status === "invalid") {
    return (
      <AuthStatus
        art={<LostEnvelope mark="!" className="w-48" />}
        title={t("resetInvalidTitle")}
        body={t("resetInvalidBody")}
        autoFocus={!brokenOnArrival}
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">{t("resetInvalidButton")}</Link>
        </Button>
      </AuthStatus>
    );
  }

  const { errors, isSubmitting } = form.formState;
  const password = fieldA11y("password", {
    invalid: Boolean(errors.password),
    hint: !errors.password,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-5"
    >
      <Field data-invalid={Boolean(errors.password)}>
        <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
        <PasswordInput
          {...password.control}
          autoComplete="new-password"
          {...form.register("password")}
        />
        {/* The hint and the "too short" error say the same thing: show one or the other. */}
        {errors.password ? (
          <FieldError id={password.errorId}>{translateError(errors.password.message)}</FieldError>
        ) : (
          <FieldDescription id={password.hintId}>{t("passwordHint")}</FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Spinner /> : null}
        {t("resetButton")}
      </Button>
    </form>
  );
}
