"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { THEME_LIST, themeStyle } from "@/themes";
import { ThemeDecorations } from "@/themes/decorations";
import type { ThemeId } from "../schema";

/** Visual theme chooser: each option is a mini invite in that theme. */
export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}) {
  const t = useTranslations("themes");
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {THEME_LIST.map((theme) => {
        const selected = theme.id === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled card works better than a native radio here
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(theme.id)}
            className={cn(
              "invite-page relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl p-2 text-start outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-foreground/30",
            )}
            style={themeStyle(theme.id)}
          >
            <ThemeDecorations theme={theme.id} />
            {selected ? (
              <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-4" />
              </span>
            ) : null}
            <span className="invite-card relative rounded-lg px-2 py-1.5">
              <span className="invite-heading block font-semibold text-sm">
                {theme.emoji} {t(`${theme.id}.name`)}
              </span>
              <span className="block text-[11px] text-invite-muted leading-tight">
                {t(`${theme.id}.tagline`)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
