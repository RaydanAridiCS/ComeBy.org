"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "../dto";
import { ActivityFeed } from "./activity-feed";
import { EventActions } from "./event-actions";
import { ResponsesTable } from "./responses-table";
import { ShareCard } from "./share-card";
import { StatsCards } from "./stats-cards";

const REFRESH_MS = 15_000;

async function fetchDashboard(eventId: string): Promise<DashboardData> {
  const response = await fetch(`/api/events/${eventId}/live`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Dashboard refresh failed: ${response.status}`);
  return (await response.json()) as DashboardData;
}

/**
 * The host's view of one event. Starts from server-rendered data and refreshes
 * itself every few seconds, so new responses appear without reloading.
 */
export function EventDashboard({ initialData }: { initialData: DashboardData }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = ["event-dashboard", initialData.event.id];

  // After a server action, the page re-renders with fresher data: adopt it right away.
  useEffect(() => {
    queryClient.setQueryData<DashboardData>(["event-dashboard", initialData.event.id], (current) =>
      !current || current.at < initialData.at ? initialData : current,
    );
  }, [queryClient, initialData]);

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchDashboard(initialData.event.id),
    initialData,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const { event } = data;
  const badges = [
    event.hidden ? { label: t("dashboard.statusHidden"), destructive: true } : null,
    event.status === "cancelled"
      ? { label: t("dashboard.statusCancelled"), destructive: true }
      : null,
    event.status === "active" && event.over
      ? { label: t("dashboard.statusEnded"), destructive: false }
      : null,
    event.status === "active" && !event.over && event.blocked === "closed"
      ? { label: t("dashboard.statusClosed"), destructive: false }
      : null,
  ].filter((badge) => badge !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("eventDashboard.backToEvents")}
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground">{event.when}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {badges.map((badge) => (
                <Badge key={badge.label} variant={badge.destructive ? "destructive" : "secondary"}>
                  {badge.label}
                </Badge>
              ))}
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                <Radio className="size-3 animate-pulse text-emerald-500" aria-hidden="true" />
                {t("eventDashboard.liveUpdates")}
              </span>
            </div>
          </div>
          <EventActions event={event} />
        </div>
        {event.hidden ? (
          <Alert variant="destructive">
            <AlertDescription>{t("eventPage.hiddenBody")}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <StatsCards stats={data.stats} capacity={data.capacity} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ResponsesTable data={data} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ShareCard event={event} />
          <ActivityFeed activity={data.activity} />
        </div>
      </div>
    </div>
  );
}
