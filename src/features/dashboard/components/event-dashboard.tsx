"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ThemeId } from "@/features/events/schema";
import { themeStyle } from "@/themes";
import { ThemeBackdrop } from "@/themes/decorations";
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
export function EventDashboard({
  initialData,
  theme,
}: {
  initialData: DashboardData;
  theme: ThemeId;
}) {
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
    event.hidden ? { label: t("dashboard.statusHidden"), variant: "destructive" as const } : null,
    event.status === "cancelled"
      ? { label: t("dashboard.statusCancelled"), variant: "destructive" as const }
      : null,
    event.status === "active" && event.over
      ? { label: t("dashboard.statusEnded"), variant: "secondary" as const }
      : null,
    event.status === "active" && !event.over && event.blocked === "closed"
      ? { label: t("dashboard.statusClosed"), variant: "outline" as const }
      : null,
  ].filter((badge) => badge !== null);
  const live = event.status === "active" && !event.over;

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="flex flex-col gap-6">
          <Link
            href="/dashboard"
            className="inline-flex animate-rise items-center gap-1.5 self-start rounded-lg py-1 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t("eventDashboard.backToEvents")}
          </Link>

          <header className="animate-rise overflow-hidden rounded-[2rem] border bg-card shadow-sm [--i:1]">
            <div className="relative h-24 w-full overflow-hidden sm:h-32" style={themeStyle(theme)}>
              <ThemeBackdrop theme={theme} />
            </div>
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="heading break-words text-headline">{event.title}</h1>
                <p className="text-muted-foreground">{event.when}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {badges.map((badge) => (
                    <Badge key={badge.label} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                  {live ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-2.5 py-1 font-semibold text-success-ink text-xs">
                      <span className="relative flex size-2" aria-hidden="true">
                        <span className="absolute inset-0 animate-ping-soft rounded-full bg-success" />
                        <span className="relative size-2 rounded-full bg-success" />
                      </span>
                      {t("eventDashboard.liveUpdates")}
                    </span>
                  ) : null}
                </div>
              </div>
              <EventActions event={event} />
            </div>
          </header>

          {event.hidden ? (
            <Alert variant="destructive">
              <AlertDescription>{t("eventPage.hiddenBody")}</AlertDescription>
            </Alert>
          ) : null}

          <StatsCards stats={data.stats} capacity={data.capacity} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <ResponsesTable data={data} />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <ShareCard event={event} />
              <ActivityFeed activity={data.activity} />
            </div>
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
