import { CalendarPlus, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

export type CalendarLinks = { google: string; outlook: string; ics: string };

/**
 * "Add to calendar" with Google, Apple (.ics), Outlook and a generic .ics download.
 * A native <details> menu: no JavaScript, keyboard accessible, light on the invite page.
 */
export function CalendarMenu({ links }: { links: CalendarLinks }) {
  const t = useTranslations("eventPage");
  const itemClass =
    "invite-focus flex min-h-11 items-center rounded-xl px-3 font-medium text-sm transition-colors hover:bg-(--invite-accent-soft)";
  return (
    <details className="group relative inline-block [&_summary::-webkit-details-marker]:hidden">
      <summary className="invite-chip invite-focus relative inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-full px-3.5 font-semibold text-(--invite-accent-ink) text-sm transition hover:brightness-95 after:absolute after:-inset-1 after:content-['']">
        <CalendarPlus className="size-4" aria-hidden="true" />
        {t("addToCalendar")}
        <ChevronDown
          className="size-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div
        data-surface="glass"
        className="invite-card absolute start-0 top-full z-30 mt-2 flex min-w-52 animate-pop flex-col rounded-2xl p-1.5 shadow-xl"
      >
        <a href={links.google} target="_blank" rel="noopener noreferrer" className={itemClass}>
          {t("calendarGoogle")}
        </a>
        <a href={links.ics} className={itemClass}>
          {t("calendarApple")}
        </a>
        <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={itemClass}>
          {t("calendarOutlook")}
        </a>
        <a href={links.ics} download className={itemClass}>
          {t("calendarOther")}
        </a>
      </div>
    </details>
  );
}
