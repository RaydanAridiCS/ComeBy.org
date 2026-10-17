"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** "Starts in 3 days 4 hours", updated every minute. Renders after mount to avoid clock skew. */
export function Countdown({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const t = useTranslations("eventPage");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return null;
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (now >= end) return <p className="font-medium text-invite-muted text-sm">{t("ended")}</p>;
  if (now >= start) return <p className="font-semibold text-invite-accent">{t("happeningNow")}</p>;

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

  return (
    <p className="text-sm">
      <span className="text-invite-muted">{t("startsIn")} </span>
      <span className="font-semibold">{parts.join(" ")}</span>
    </p>
  );
}
