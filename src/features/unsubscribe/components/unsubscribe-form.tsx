"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { unsubscribeAction } from "../actions";

/** Asks for confirmation first, so link scanners that open every URL can't unsubscribe anyone. */
export function UnsubscribeForm({
  token,
  scope,
  email,
}: {
  token: string;
  scope: "guest" | "host";
  email: string;
}) {
  const t = useTranslations("unsubscribe");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex animate-pop flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-brand">
          <MailCheck className="size-8" aria-hidden="true" />
        </span>
        <h1 className="heading text-headline">{t("doneTitle")}</h1>
        <output className="text-muted-foreground">
          {t(scope === "host" ? "doneHost" : "doneGuest", { email })}
        </output>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="heading text-headline">{t("title")}</h1>
      <p className="text-muted-foreground">
        {t(scope === "host" ? "confirmHost" : "confirmGuest", { email })}
      </p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await unsubscribeAction({ token });
            if (result.ok) setDone(true);
            else setError(result.error.message);
          })
        }
      >
        {pending ? <Spinner /> : null}
        {t("button")}
      </Button>
    </div>
  );
}
