"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

/**
 * "Starts in 3 days 4 hours" as a chip, updated every minute. It renders after
 * mount to avoid clock skew, inside a fixed-height slot so nothing shifts.
 */
export function Countdown({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const t = useTranslations("eventPage");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  let content: ReactNode = null;
  if (now !== null) {
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    if (now >= end) {
      content = <span className="text-invite-muted">{t("ended")}</span>;
    } else if (now >= start) {
      content = (
        <>
          <LiveDot />
          <span className="font-semibold">{t("happeningNow")}</span>
        </>
      );
    } else {
      const minutes = Math.floor((start - now) / 60_000);
      const days = Math.floor(minutes / (60 * 24));
      const hours = Math.floor((minutes % (60 * 24)) / 60);
      const mins = minutes % 60;
      const parts =
        days > 0
          ? [t("countdownDays", { count: days }), t("countdownHours", { count: hours })]
          : hours > 0
            ? [t("countdownHours", { count: hours }), t("countdownMinutes", { count: mins })]
            : [t("countdownMinutes", { count: Math.max(mins, 1) })];
      content = (
        <>
          <LiveDot />
          <span className="text-invite-muted">{t("startsIn")}</span>
          <span className="font-semibold tabular-nums">{parts.join(" ")}</span>
        </>
      );
    }
  }

  return (
    <div className="h-8">
      {content ? (
        <p className="invite-chip inline-flex h-8 animate-pop items-center gap-1.5 rounded-full px-3 text-sm">
          {content}
        </p>
      ) : null}
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative me-0.5 flex size-2" aria-hidden="true">
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--invite-accent-ink) opacity-60" />
      <span className="relative size-2 rounded-full bg-(--invite-accent-ink)" />
    </span>
  );
}
