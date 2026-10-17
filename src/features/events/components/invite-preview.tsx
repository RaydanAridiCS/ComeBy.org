"use client";

import { Check, HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { InviteCard } from "@/features/rsvp/components/invite-card";
import {
  formatDateParts,
  formatEventDay,
  formatEventTime,
  formatTimeZoneLabel,
  isValidTimeZone,
  zonedInputToDate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { themeStyle } from "@/themes";
import { ThemeBackdrop } from "@/themes/decorations";
import type { EventFormInput, ThemeId } from "../schema";

/** The form values the preview needs, with blanks as empty strings. */
export type PreviewValues = {
  title: string;
  hostName: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationType: EventFormInput["locationType"];
  locationName: string;
  locationAddress: string;
  theme: ThemeId;
};

/** Object URL for a picked (not yet uploaded) cover, cleaned up when it changes. */
function useFileUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

/** Static look-alike of the RSVP buttons, so the preview feels complete. */
function RsvpPreview() {
  const t = useTranslations("rsvp");
  const options = [
    { label: t("going"), icon: Check },
    { label: t("maybe"), icon: HelpCircle },
    { label: t("notGoing"), icon: X },
  ];
  return (
    <div
      className="flex flex-col gap-4 border-(--invite-card-border) border-t pt-6"
      aria-hidden="true"
    >
      <p className="invite-heading text-center text-2xl">{t("title")}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option, index) => (
          <span
            key={option.label}
            className={cn(
              "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl font-semibold text-sm",
              index === 0 ? "bg-invite-accent text-invite-accent-fg shadow-md" : "invite-chip",
            )}
          >
            <option.icon className="size-5" />
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The invite exactly as guests will see it, updated live from the form. */
export function InvitePreview({
  values,
  coverFile,
  coverUrl,
  className,
}: {
  values: PreviewValues;
  coverFile: File | null;
  coverUrl: string | null;
  className?: string;
}) {
  const t = useTranslations("eventForm");
  const fileUrl = useFileUrl(coverFile);

  const when = useMemo(() => {
    const timeZone = values.timezone && isValidTimeZone(values.timezone) ? values.timezone : "UTC";
    const start = values.startsAt ? zonedInputToDate(values.startsAt, timeZone) : null;
    if (!start) return null;
    const end = values.endsAt ? zonedInputToDate(values.endsAt, timeZone) : null;
    return {
      heroDate: formatDateParts(start, timeZone),
      dayLabel: formatEventDay(start, timeZone),
      timeLabel: `${formatEventTime(start, timeZone)}${end ? ` – ${formatEventTime(end, timeZone)}` : ""}`,
      zoneLabel: formatTimeZoneLabel(start, timeZone),
    };
  }, [values.startsAt, values.endsAt, values.timezone]);

  return (
    <div
      className={cn("invite-page relative isolate overflow-hidden", className)}
      style={themeStyle(values.theme)}
    >
      <ThemeBackdrop theme={values.theme} />
      <div className="relative p-3 sm:p-4">
        <InviteCard
          titleAs="p"
          theme={values.theme}
          title={values.title.trim() || t("previewUntitled")}
          hostName={values.hostName.trim() || "?"}
          coverUrl={fileUrl ?? coverUrl}
          heroDate={when?.heroDate ?? { day: "–", month: "", weekday: "" }}
          dayLabel={when?.dayLabel ?? t("previewPickDate")}
          timeLabel={when?.timeLabel ?? t("previewPickTime")}
          zoneLabel={when?.zoneLabel ?? values.timezone}
          locationType={values.locationType}
          locationName={values.locationName.trim() || null}
          locationAddress={values.locationAddress.trim() || null}
          mapsHref={null}
          onlineHref={null}
          description={values.description.trim() || null}
        >
          <RsvpPreview />
        </InviteCard>
      </div>
    </div>
  );
}
