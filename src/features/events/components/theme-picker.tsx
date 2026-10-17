"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRovingRadio } from "@/components/forms/use-roving-radio";
import { useTilt } from "@/components/motion/use-tilt";
import { cn } from "@/lib/utils";
import { THEME_LIST } from "@/themes";
import { InviteMini } from "@/themes/invite-mini";
import { THEMES, type ThemeId } from "../schema";

/** Visual theme chooser: each option is a miniature invite in that theme. */
export function ThemePicker({
  value,
  onChange,
  previewTitle,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  /** The event's title, shown on every preview once the host has typed one. */
  previewTitle?: string;
}) {
  const t = useTranslations("themes");
  const tilt = useTilt();
  const radio = useRovingRadio<ThemeId>([...THEMES], value, onChange);

  return (
    <div
      role="radiogroup"
      aria-label={t("pickerLabel")}
      className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pt-2 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-5"
    >
      {THEME_LIST.map((theme, index) => {
        const selected = theme.id === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled card works better than a native radio here
          <button
            key={theme.id}
            ref={(element) => {
              radio.refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={radio.tabIndex(theme.id, index)}
            onClick={() => onChange(theme.id)}
            onKeyDown={(event) => radio.onKeyDown(event, index)}
            {...tilt}
            className="group tilt flex w-[42%] shrink-0 snap-start flex-col gap-2.5 rounded-2xl text-start outline-none sm:w-auto"
          >
            <span
              className={cn(
                "relative block overflow-hidden rounded-2xl transition-shadow duration-300",
                selected
                  ? "shadow-lg ring-2 ring-brand-600 ring-offset-2 ring-offset-card"
                  : "shadow-sm ring-1 ring-border group-hover:shadow-md",
                "group-focus-visible:ring-4 group-focus-visible:ring-ring/40",
              )}
            >
              <InviteMini theme={theme.id} title={previewTitle} className="aspect-[3/4] w-full" />
              {selected ? (
                <span className="absolute end-2 top-2 flex size-7 animate-pop items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  <span className="sr-only">{t("selected")}</span>
                </span>
              ) : null}
            </span>
            <span className="flex flex-col px-0.5">
              <span
                className={cn(
                  "font-semibold text-sm",
                  selected ? "text-brand-700" : "text-foreground",
                )}
              >
                {t(`${theme.id}.name`)}
              </span>
              <span className="text-muted-foreground text-xs leading-snug">
                {t(`${theme.id}.tagline`)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
