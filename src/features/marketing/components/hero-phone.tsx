"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { THEMES } from "@/features/events/schema";
import { cn } from "@/lib/utils";
import { THEME_TOKENS } from "@/themes";
import { InviteMini } from "@/themes/invite-mini";

const CYCLE_MS = 3600;

/** The landing hero: a phone cycling through the five invite themes. */
export function HeroPhone() {
  const t = useTranslations();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % THEMES.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className="relative mx-auto flex w-full max-w-[22rem] flex-col items-center gap-5">
      <div className="absolute inset-x-0 top-10 -z-10 mx-auto aspect-square w-[130%] -translate-x-[11%] rounded-full bg-[radial-gradient(circle,oklch(0.68_0.14_264/0.35),transparent_65%)] blur-2xl rtl:translate-x-[11%]" />

      <div
        className="relative aspect-[9/18.5] w-[16.5rem] rounded-[3rem] bg-[#0b0d17] p-2.5 shadow-xl ring-1 ring-black/10 sm:w-[18rem]"
        aria-hidden="true"
      >
        <div className="relative size-full overflow-hidden rounded-[2.45rem] [clip-path:inset(0_round_2.45rem)]">
          {THEMES.map((theme, index) => (
            <InviteMini
              key={theme}
              theme={theme}
              detailed
              className={cn(
                "absolute inset-0 size-full transition-[opacity,transform] duration-700 ease-(--ease-out-soft)",
                index === active ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
              )}
            />
          ))}
          <span className="absolute top-2.5 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0b0d17]" />
        </div>
      </div>

      <div
        className="animate-float absolute top-[22%] -start-4 flex items-center gap-2.5 rounded-2xl border bg-card/95 py-2.5 ps-2.5 pe-4 shadow-lg backdrop-blur sm:-start-14"
        aria-hidden="true"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-success-soft font-bold text-sm text-success-ink">
          O
        </span>
        <span className="flex flex-col">
          <span className="flex items-center gap-1 font-semibold text-sm">
            {t("landing.heroToastGoing")}
            <Check className="size-3.5 text-success" strokeWidth={3} />
          </span>
          <span className="text-muted-foreground text-xs">{t("landing.heroToastWhen")}</span>
        </span>
      </div>

      <div
        className="animate-float-delayed absolute -end-3 bottom-[26%] flex items-center gap-2 rounded-full border bg-card/95 py-2 ps-2 pe-4 shadow-lg backdrop-blur sm:-end-12"
        aria-hidden="true"
      >
        <span className="flex -space-x-2 rtl:space-x-reverse">
          {["#ffe1ea", "#dff4ff", "#fff1c9"].map((color, index) => (
            <span
              key={color}
              className="flex size-7 items-center justify-center rounded-full font-bold text-[0.6875rem] text-foreground/80 ring-2 ring-card"
              style={{ background: color }}
            >
              {["M", "J", "R"][index]}
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-sm">
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-success-ink">
            12 {t("rsvp.going")}
          </span>
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning-ink">
            3 {t("rsvp.maybe")}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {THEMES.map((theme, index) => (
          <button
            key={theme}
            type="button"
            aria-label={t("landing.heroShowTheme", { name: t(`themes.${theme}.name`) })}
            aria-pressed={index === active}
            onClick={() => {
              setActive(index);
              setPaused(true);
            }}
            className="group flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <span
              className={cn(
                "block rounded-full transition-all duration-300",
                index === active ? "h-2.5 w-6" : "size-2.5 opacity-50 group-hover:opacity-80",
              )}
              style={{ background: THEME_TOKENS[theme].accent }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
