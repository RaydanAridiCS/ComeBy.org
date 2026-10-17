import { CalendarPlus, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEventWhen } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import type { EventWithStats } from "@/server/repositories/types";
import { eventService } from "@/server/services";
import { isEventOver } from "@/server/services/event.service";
import { THEME_TOKENS } from "@/themes";
import { EventStatusBadges } from "./event-status-badges";

export async function EventList() {
  const user = await requireUser("/dashboard");
  await connection();
  const now = new Date();
  const [events, usage, t] = await Promise.all([
    eventService.listForHost(user.id),
    eventService.usage(user.id),
    getTranslations("dashboard"),
  ]);

  const upcoming = events
    .filter((event) => !isEventOver(event, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events.filter((event) => isEventOver(event, now));

  if (events.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarPlus />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyBody")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-full">
            <Link href="/dashboard/events/new">{t("createEvent")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("usage", usage)}</p>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            {t("upcoming")} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            {t("past")} ({past.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length > 0 ? (
            <EventGrid events={upcoming} now={now} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t("emptyBody")}</p>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          {past.length > 0 ? (
            <EventGrid events={past} now={now} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t("emptyPastBody")}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function EventGrid({ events, now }: { events: EventWithStats[]; now: Date }) {
  const t = await getTranslations("dashboard");
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {events.map((event) => {
        const theme = THEME_TOKENS[event.theme];
        return (
          <li key={event.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
            <div
              className="flex h-16 items-end px-4 pb-2 text-2xl"
              style={{ background: theme.background }}
              aria-hidden="true"
            >
              {theme.emoji}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex flex-col gap-1">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="font-semibold text-lg leading-snug hover:underline"
                >
                  {event.title}
                </Link>
                <p className="text-muted-foreground text-sm">
                  {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                </p>
              </div>
              <EventStatusBadges event={event} now={now} />
              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">
                  {t("goingCount", { count: event.stats.guests })}
                </span>
                <span className="text-muted-foreground">
                  · {t("responsesCount", { count: event.stats.total })}
                </span>
              </div>
              <div className="mt-auto flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/dashboard/events/${event.id}`}>{t("viewDashboard")}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${event.slug}`} target="_blank">
                    <ExternalLink />
                    <span className="sr-only sm:not-sr-only">{t("viewInvite")}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function EventListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1].map((key) => (
        <Skeleton key={key} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}
