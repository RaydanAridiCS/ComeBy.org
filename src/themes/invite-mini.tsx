import { CalendarDays, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ThemeId } from "@/features/events/schema";
import { formatDateParts, formatEventTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ThemeBackdrop, ThemeHeroArt } from "./decorations";
import { THEME_TOKENS, themeStyle } from "./index";

/** Fixed sample dates for previews (formatted in UTC, so they never depend on the clock). */
const SAMPLE_DATES: Record<ThemeId, string> = {
  confetti: "2026-11-07T20:00:00Z",
  wild: "2026-11-08T05:30:00Z",
  sunset: "2026-07-18T15:00:00Z",
  midnight: "2026-11-13T21:00:00Z",
  clean: "2026-11-19T18:00:00Z",
  velvet: "2026-11-21T20:30:00Z",
  cyber: "2026-11-27T23:00:00Z",
  aura: "2026-11-15T16:00:00Z",
  oasis: "2026-07-25T14:00:00Z",
  matcha: "2026-11-22T10:30:00Z",
};

/**
 * A realistic miniature invite in a theme, for the theme picker and the landing
 * page. Everything is sized in container units, so it scales with its box.
 */
export function InviteMini({
  theme: id,
  title,
  detailed = false,
  className,
}: {
  theme: ThemeId;
  /** Overrides the sample title (e.g. the event being edited). */
  title?: string;
  /** Adds the when/where rows and guests, for tall frames like the landing phone. */
  detailed?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const theme = THEME_TOKENS[id];
  const date = new Date(SAMPLE_DATES[id]);
  const parts = formatDateParts(date, "UTC");
  const statuses = [t("rsvp.going"), t("rsvp.maybe"), t("rsvp.notGoing")];

  return (
    <div
      className={cn("@container invite-page relative isolate overflow-hidden", className)}
      style={themeStyle(id)}
      aria-hidden="true"
    >
      <ThemeBackdrop theme={id} />
      <div
        data-surface={theme.surface}
        className="invite-card absolute inset-x-[6%] top-[6%] -bottom-px flex flex-col overflow-hidden rounded-t-[8cqw] shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)]"
      >
        <ThemeHeroArt theme={id} date={parts} className="aspect-[20/10] w-full shrink-0" />
        <div className="flex flex-col gap-[2.8cqw] p-[5.5cqw]">
          <p className="truncate text-[3.8cqw] text-invite-muted">
            {t("eventPage.hostedBy", { name: t(`themes.${id}.sampleHost`) })}
          </p>
          <p
            className="invite-heading line-clamp-2 leading-[1.02]"
            style={{ fontSize: `calc(9.5cqw * ${theme.displayScale})` }}
          >
            {title || t(`themes.${id}.sampleTitle`)}
          </p>
          <p className="invite-chip self-start whitespace-nowrap rounded-full px-[3.2cqw] py-[1.5cqw] font-semibold text-[3.4cqw]">
            {parts.weekday.slice(0, 3)} {parts.day} {parts.month} · {formatEventTime(date, "UTC")}
          </p>
          {detailed ? (
            <div className="mt-[1cqw] flex flex-col overflow-hidden rounded-[4cqw] ring-(--invite-card-border) ring-1">
              {[
                { icon: CalendarDays, text: `${parts.weekday}, ${parts.day} ${parts.month}` },
                { icon: MapPin, text: t(`themes.${id}.samplePlace`) },
              ].map((row) => (
                <span
                  key={row.text}
                  className="flex items-center gap-[2.6cqw] border-(--invite-card-border) border-b p-[3cqw] last:border-b-0"
                >
                  <span className="invite-chip flex size-[8cqw] shrink-0 items-center justify-center rounded-[2.4cqw] text-(--invite-accent-ink)">
                    <row.icon className="size-[4cqw]" />
                  </span>
                  <span className="truncate font-semibold text-[3.6cqw]">{row.text}</span>
                </span>
              ))}
            </div>
          ) : null}
          {detailed ? (
            <span className="flex items-center gap-[2cqw]">
              <span className="flex -space-x-[1.6cqw] rtl:space-x-reverse">
                {theme.avatarTones.slice(0, 3).map(([background, color], index) => (
                  <span
                    key={background}
                    className="flex size-[7cqw] items-center justify-center rounded-full font-bold text-[3cqw] ring-[0.8cqw] ring-(--invite-card)"
                    style={{ background, color }}
                  >
                    {["M", "J", "R"][index]}
                  </span>
                ))}
              </span>
              <span className="font-semibold text-[3.6cqw]">
                {t("eventPage.goingCount", { count: 18 })}
              </span>
            </span>
          ) : null}
          <div className="mt-[1.5cqw] grid grid-cols-3 gap-[2cqw]">
            {statuses.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "truncate rounded-[3cqw] py-[2.6cqw] text-center font-semibold text-[3.3cqw]",
                  index === 0 ? "bg-invite-accent text-invite-accent-fg" : "invite-chip",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
