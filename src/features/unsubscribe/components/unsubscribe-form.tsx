"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
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
  const doneHeading = useRef<HTMLHeadingElement>(null);

  // The button that was pressed is gone: move focus to the news, so it is read out.
  useEffect(() => {
    if (done) doneHeading.current?.focus();
  }, [done]);

  if (done) {
    return (
      <div className="flex animate-pop flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-brand">
          <MailCheck className="size-8" aria-hidden="true" />
        </span>
        <h1 ref={doneHeading} tabIndex={-1} className="heading text-headline outline-none">
          {t("doneTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t(scope === "host" ? "doneHost" : "doneGuest", { email })}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {scope === "host" ? (
            <Button asChild size="lg">
              <Link href="/dashboard/settings">{t("settings")}</Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant={scope === "host" ? "outline" : "default"}>
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
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
