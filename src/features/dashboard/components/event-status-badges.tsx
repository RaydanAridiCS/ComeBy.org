import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { EventRecord } from "@/server/repositories/types";
import { isEventOver } from "@/server/services/event.service";

export function EventStatusBadges({
  event,
  now,
}: {
  event: Pick<
    EventRecord,
    "status" | "hiddenAt" | "rsvpClosed" | "rsvpDeadline" | "startsAt" | "endsAt"
  >;
  now: Date;
}) {
  const t = useTranslations("dashboard");
  const badges: { key: string; label: string; variant: "destructive" | "secondary" | "outline" }[] =
    [];
  if (event.hiddenAt)
    badges.push({ key: "hidden", label: t("statusHidden"), variant: "destructive" });
  if (event.status === "cancelled") {
    badges.push({ key: "cancelled", label: t("statusCancelled"), variant: "destructive" });
  } else if (isEventOver(event, now)) {
    badges.push({ key: "ended", label: t("statusEnded"), variant: "secondary" });
  } else if (
    event.rsvpClosed ||
    (event.rsvpDeadline && event.rsvpDeadline.getTime() <= now.getTime())
  ) {
    badges.push({ key: "closed", label: t("statusClosed"), variant: "outline" });
  }
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge.key} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
