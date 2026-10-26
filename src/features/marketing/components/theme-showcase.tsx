"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { useTilt } from "@/components/motion/use-tilt";
import { THEME_LIST } from "@/themes";
import { InviteMini } from "@/themes/invite-mini";

/** The landing page's themes gallery: large mini invites with a hover tilt. */
export function ThemeShowcase() {
  const t = useTranslations("themes");
  const tilt = useTilt();
  return (
    // On phones the list scrolls sideways, so it must be reachable by keyboard (WCAG 2.1.1).
    <ul
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable
      tabIndex={0}
      aria-label={t("showcaseLabel")}
      className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-2 pb-6 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5"
    >
      {THEME_LIST.map((theme, index) => (
        <li
          key={theme.id}
          className="w-[62%] shrink-0 animate-rise snap-center sm:w-auto"
          style={{ "--i": index } as CSSProperties}
        >
          <figure className="tilt flex flex-col gap-3" {...tilt}>
            <InviteMini
              theme={theme.id}
              className="aspect-[3/4] w-full rounded-3xl shadow-lg ring-1 ring-black/5"
            />
            <figcaption className="flex flex-col px-1">
              <span className="font-heading font-bold text-lg tracking-[-0.02em]">
                {t(`${theme.id}.name`)}
              </span>
              <span className="text-muted-foreground text-sm">{t(`${theme.id}.tagline`)}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
