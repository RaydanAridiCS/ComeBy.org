"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import type { RsvpStats } from "@/server/repositories/types";

export function StatsCards({
  stats,
  capacity,
}: {
  stats: RsvpStats;
  capacity: { used: number; max: number };
}) {
  const t = useTranslations("eventDashboard");
  const cards = [
    { label: t("statGuests"), value: stats.guests, hint: t("statGuestsHint"), highlight: true },
    { label: t("statGoing"), value: stats.going },
    { label: t("statMaybe"), value: stats.maybe },
    { label: t("statNotGoing"), value: stats.notGoing },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={
              card.highlight
                ? "rounded-2xl bg-primary p-4 text-primary-foreground"
                : "rounded-2xl border bg-card p-4"
            }
          >
            <p className={card.highlight ? "text-sm opacity-90" : "text-muted-foreground text-sm"}>
              {card.label}
            </p>
            <p className="font-bold text-3xl tabular-nums">{card.value}</p>
            {card.hint ? <p className="text-xs opacity-80">{card.hint}</p> : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <Progress value={(capacity.used / capacity.max) * 100} className="h-1.5 flex-1" />
        <span>{t("statCapacity", { count: capacity.used, max: capacity.max })}</span>
      </div>
    </div>
  );
}
