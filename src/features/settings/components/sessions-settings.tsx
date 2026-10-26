"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/result";
import { revokeOtherSessionsAction, revokeSessionAction } from "../actions";

export type SessionRow = {
  id: string;
  browser: string | null;
  os: string | null;
  mobile: boolean;
  lastActive: string;
  current: boolean;
};

/** Where the account is signed in, with a way to end any session. */
export function SessionsSettings({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<ActionResult>, done: string) =>
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(done);
      else toast.error(result.error.message);
    });

  const others = sessions.filter((session) => !session.current).length;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {sessions.map((session) => {
          const Icon = session.mobile ? Smartphone : Laptop;
          const label =
            [session.browser, session.os].filter(Boolean).join(" · ") || t("unknownDevice");
          return (
            <li
              key={session.id}
              className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-3"
            >
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium text-sm">
                  {label}
                  {session.current ? <Badge variant="secondary">{t("thisDevice")}</Badge> : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("lastActive")} <LocalTime iso={session.lastActive} />
                </span>
              </div>
              {session.current ? null : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  aria-label={t("signOutDevice", { device: label })}
                  onClick={() => run(() => revokeSessionAction(session.id), t("sessionEnded"))}
                >
                  {t("signOut")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={() => run(() => revokeOtherSessionsAction(), t("othersEnded"))}
        >
          {t("signOutEverywhereElse")}
        </Button>
      ) : null}
    </div>
  );
}
