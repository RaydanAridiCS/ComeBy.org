"use client";

import {
  Ban,
  type LucideIcon,
  Mail,
  Pencil,
  Repeat2,
  Sparkles,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { LocalTime } from "@/components/local-time";
import { LIST_ITEM } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { DashboardActivity } from "../dto";

const STATUSES = new Set(["going", "maybe", "not_going"]);
const CHANGES = new Set(["time", "location", "title", "details"]);

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  rsvp_created: { icon: UserPlus, tone: "bg-success-soft text-success-ink" },
  rsvp_updated: { icon: Repeat2, tone: "bg-warning-soft text-warning-ink" },
  rsvp_removed: { icon: UserMinus, tone: "bg-muted text-muted-foreground" },
  event_created: { icon: Sparkles, tone: "bg-brand-50 text-brand-700" },
  event_updated: { icon: Pencil, tone: "bg-brand-50 text-brand-700" },
  event_cancelled: { icon: Ban, tone: "bg-danger-soft text-danger-ink" },
  update_email_sent: { icon: Mail, tone: "bg-brand-50 text-brand-700" },
};

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
    <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="heading text-xl">{t("eventDashboard.activityTitle")}</h2>
      {activity.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("eventDashboard.activityEmpty")}</p>
      ) : (
        <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-2 before:start-[17px] before:w-px before:bg-border">
          <AnimatePresence initial={false}>
            {activity.map((item) => {
              const visual = ICONS[item.type] ?? {
                icon: Sparkles,
                tone: "bg-muted text-muted-foreground",
              };
              return (
                <m.li
                  key={item.id}
                  layout="position"
                  {...LIST_ITEM}
                  className="relative flex gap-3"
                >
                  <span
                    className={cn(
                      "relative flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                      visual.tone,
                    )}
                    aria-hidden="true"
                  >
                    <visual.icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col pt-1">
                    <p className="text-sm">{describe(item)}</p>
                    <LocalTime iso={item.createdAt} className="text-muted-foreground text-xs" />
                  </div>
                </m.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}
