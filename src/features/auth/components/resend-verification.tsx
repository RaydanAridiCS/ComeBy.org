"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const COOLDOWN_SECONDS = 60;

type SendResult = { error: { status?: number } | null };

/**
 * "Send the email again". After each send the button waits a minute; the server enforces
 * its own limit as well. The email that brought the person here counts as the first send.
 */
export function ResendButton({
  send,
  disabled = false,
}: {
  send: () => Promise<SendResult>;
  /** Not ready to send yet, for example while the bot check is still working. */
  disabled?: boolean;
}) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resend = () =>
    startTransition(async () => {
      setMessage(null);
      const { error } = await send();
      setSecondsLeft(COOLDOWN_SECONDS);
      if (error) {
        setMessage({
          text: error.status === 429 ? t("resendTooSoon") : t("resendFailed"),
          failed: true,
        });
        return;
      }
      setMessage({ text: t("resendSent"), failed: false });
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || disabled || secondsLeft > 0}
        onClick={resend}
      >
        {pending ? <Spinner /> : null}
        {secondsLeft > 0 ? t("resendWait", { seconds: secondsLeft }) : t("resendButton")}
      </Button>
      {message ? (
        <output className={message.failed ? "text-destructive text-sm" : "text-sm"}>
          {message.text}
        </output>
      ) : null}
    </div>
  );
}

/** Sends the "confirm your email" message again, for people who haven't confirmed yet. */
export function ResendVerification({ email, next }: { email: string; next: string }) {
  return (
    <ResendButton send={() => authClient.sendVerificationEmail({ email, callbackURL: next })} />
  );
}
