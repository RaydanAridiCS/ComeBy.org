"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fieldA11y } from "@/components/forms/field-a11y";
import { PasswordInput } from "@/components/forms/password-input";
import { Turnstile } from "@/components/forms/turnstile";
import { useFocusFirstInvalid } from "@/components/forms/use-focus-first-invalid";
import { useTranslateError } from "@/components/forms/use-translate-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FIELD_LIMITS } from "@/config/limits";
import { signUp } from "@/lib/auth-client";
import { isBotCheckError, TURNSTILE_HEADER } from "@/lib/turnstile-header";
import { firstRunNext, safeNext } from "../safe-next";
import { AuthStatus, MailHint, StatusTile } from "./auth-status";
import { GoogleButton } from "./google-button";
import { ResendVerification } from "./resend-verification";

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "auth.nameRequired" })
    .max(FIELD_LIMITS.hostNameMaxLength, { message: "auth.nameTooLong" }),
  email: z.email({ message: "auth.emailInvalid" }),
  password: z.string().min(8, { message: "auth.passwordHint" }).max(128),
});
type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm({ turnstileSiteKey }: { turnstileSiteKey: string | undefined }) {
  const t = useTranslations("auth");
  const translateError = useTranslateError();
  const requested = useSearchParams().get("next");
  const next = safeNext(requested);
  // The confirmation link lands a new host in the first-run route unless a page was asked for.
  const afterConfirm = firstRunNext(requested);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((token: string | null) => setTurnstileToken(token), []);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    shouldFocusError: false,
  });

  // Back from "Check your email" to fix the address: the form keeps what was typed.
  const editingEmail = useRef(false);
  useEffect(() => {
    if (sentTo === null && editingEmail.current) {
      editingEmail.current = false;
      form.setFocus("email", { shouldSelect: true });
    }
  }, [sentTo, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signUp.email({
      ...values,
      callbackURL: afterConfirm,
      fetchOptions: { headers: turnstileToken ? { [TURNSTILE_HEADER]: turnstileToken } : {} },
    });
    if (!error) {
      setSentTo(values.email);
      return;
    }
    if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
      setFormError(t("emailTaken"));
      // The button was disabled while sending, which drops focus: put it where the fix is.
      form.setFocus("email", { shouldSelect: true });
    } else if (isBotCheckError(error.code))
      setFormError(translateError("errors.bot_check_failed") ?? null);
    else if (error.code === "TOO_MANY_SIGNUPS") setFormError(t("tooManySignups"));
    else if (error.status === 429) setFormError(translateError("errors.rate_limited") ?? null);
    else setFormError(translateError("errors.generic") ?? null);
  }, focusFirstInvalid);

  if (sentTo) {
    return (
      <AuthStatus
        art={<StatusTile icon={MailCheck} />}
        title={t("checkEmailTitle")}
        body={t("checkEmailBody", { email: sentTo })}
      >
        <MailHint>{t("checkEmailHint")}</MailHint>
        <ResendVerification email={sentTo} next={afterConfirm} />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            editingEmail.current = true;
            setSentTo(null);
          }}
        >
          {t("useDifferentEmail")}
        </Button>
      </AuthStatus>
    );
  }

  const { errors, isSubmitting } = form.formState;
  const name = fieldA11y("name", { invalid: Boolean(errors.name) });
  const email = fieldA11y("email", { invalid: Boolean(errors.email) });
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
      <GoogleButton next={next} newUserNext={afterConfirm} />
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
          <Input
            {...name.control}
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            {...form.register("name")}
          />
          <FieldError id={name.errorId}>{translateError(errors.name?.message)}</FieldError>
        </Field>
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
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
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
