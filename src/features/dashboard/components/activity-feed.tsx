"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalTime } from "@/components/local-time";
import type { DashboardActivity } from "../dto";

const STATUSES = new Set(["going", "maybe", "not_going"]);
const CHANGES = new Set(["time", "location", "title", "details"]);

/** Timeline of everything that happened on the event, newest first. */
export function ActivityFeed({ activity }: { activity: DashboardActivity[] }) {
  const t = useTranslations();

  const status = (value: string | undefined) =>
    value && STATUSES.has(value) ? t(`status.${value as "going" | "maybe" | "not_going"}`) : "";

  function describe(item: DashboardActivity): string {
    const name = item.data.guestName ?? "";
    switch (item.type) {
      case "rsvp_created":
        return t("eventDashboard.activity.rsvp_created", { name, status: status(item.data.to) });
      case "rsvp_updated":
        return item.data.from === item.data.to
          ? t("eventDashboard.activity.rsvp_created", { name, status: status(item.data.to) })
          : t("eventDashboard.activity.rsvp_updated", {
              name,
              from: status(item.data.from),
              to: status(item.data.to),
            });
      case "rsvp_removed":
        return t("eventDashboard.activity.rsvp_removed", { name });
      case "event_updated": {
        const changes = (item.data.changes ?? [])
          .filter((change) => CHANGES.has(change))
          .map((change) => t(`changes.${change as "time" | "location" | "title" | "details"}`));
        return changes.length > 0
          ? t("eventDashboard.activity.event_updated", { changes: changes.join(", ") })
          : t("eventForm.saved");
      }
      default:
        return t(`eventDashboard.activity.${item.type}`, {
          name,
          changes: "",
          status: "",
          from: "",
          to: "",
        });
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold text-lg">
        <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
        {t("eventDashboard.activityTitle")}
      </h2>
      {activity.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("eventDashboard.activityEmpty")}</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-s ps-4">
          {activity.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute top-1.5 -start-[21px] size-2.5 rounded-full border-2 border-background bg-primary"
                aria-hidden="true"
              />
              <p className="text-sm">{describe(item)}</p>
              <LocalTime iso={item.createdAt} className="text-muted-foreground text-xs" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
