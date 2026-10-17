"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
    { label: t("statGoing"), value: stats.going, dot: "bg-success" },
    { label: t("statMaybe"), value: stats.maybe, dot: "bg-warning" },
    { label: t("statNotGoing"), value: stats.notGoing, dot: "bg-muted-foreground/40" },
  ];
  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative isolate col-span-2 flex animate-rise flex-col justify-between gap-3 overflow-hidden rounded-3xl bg-brand-gradient p-5 text-white shadow-brand lg:col-span-1">
          <div className="surface-noise absolute inset-0 -z-10 opacity-20 mix-blend-overlay" />
          <p className="font-medium text-sm text-white/85">{t("statGuests")}</p>
          <p className="heading text-5xl leading-none">
            <AnimatedNumber value={stats.guests} />
          </p>
          <p className="text-white/75 text-xs">{t("statGuestsHint")}</p>
        </div>
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="flex animate-rise flex-col justify-between gap-3 rounded-3xl border bg-card p-5 shadow-xs"
            style={{ "--i": index + 1 } as CSSProperties}
          >
            <p className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <span className={cn("size-2 rounded-full", card.dot)} aria-hidden="true" />
              {card.label}
            </p>
            <p className="heading text-4xl leading-none">
              <AnimatedNumber value={card.value} />
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-muted-foreground text-xs shadow-xs">
        <Progress
          value={(capacity.used / capacity.max) * 100}
          className="flex-1"
          aria-label={t("statCapacity", { count: capacity.used, max: capacity.max })}
        />
        <span className="shrink-0 tabular-nums">
          {t("statCapacity", { count: capacity.used, max: capacity.max })}
        </span>
      </div>
    </section>
  );
}
