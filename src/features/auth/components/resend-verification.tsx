"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const COOLDOWN_SECONDS = 60;

/**
 * "Send the email again" for people who haven't confirmed their address yet. After each
 * send the button waits a minute; the server enforces its own limit as well.
 */
export function ResendVerification({ email, next }: { email: string; next: string }) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  // The email that brought the person here counts as the first send.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resend = () =>
    startTransition(async () => {
      setMessage(null);
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: next });
      if (error) {
        setMessage({
          text: error.status === 429 ? t("resendTooSoon") : t("resendFailed"),
          failed: true,
        });
        setSecondsLeft(COOLDOWN_SECONDS);
        return;
      }
      setMessage({ text: t("resendSent"), failed: false });
      setSecondsLeft(COOLDOWN_SECONDS);
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || secondsLeft > 0}
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
