"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CalendarLinks = { google: string; outlook: string; ics: string };

/** "Add to calendar" with Google, Apple (.ics), Outlook and a generic .ics download. */
export function CalendarMenu({ links }: { links: CalendarLinks }) {
  const t = useTranslations("eventPage");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full bg-invite-accent-soft px-4 py-2 font-semibold text-sm transition hover:brightness-95">
        <CalendarPlus className="size-4" aria-hidden="true" />
        {t("addToCalendar")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem asChild>
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            {t("calendarGoogle")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.ics}>{t("calendarApple")}</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer">
            {t("calendarOutlook")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.ics} download>
            {t("calendarOther")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
