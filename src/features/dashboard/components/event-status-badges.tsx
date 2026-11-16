import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { type EventState, eventState } from "@/features/events/state";
import type { EventRecord } from "@/server/repositories/types";

const BADGES = {
  hidden: { label: "statusHidden", variant: "outline" },
  cancelled: { label: "statusCancelled", variant: "destructive" },
  ended: { label: "statusEnded", variant: "secondary" },
  closed: { label: "statusClosed", variant: "outline" },
} as const;

/** One badge for an event that isn't live: under review, cancelled, ended or RSVPs closed. */
export function EventStateBadge({ state }: { state: EventState }) {
  const t = useTranslations("dashboard");
  if (state === "live") return null;
  const badge = BADGES[state];
  return <Badge variant={badge.variant}>{t(badge.label)}</Badge>;
}

/** The badge for an event in the host's event list. */
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
  const state = eventState(event, now);
  if (state === "live") return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <EventStateBadge state={state} />
    </div>
  );
}
