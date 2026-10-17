import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ThemeId } from "@/features/events/schema";
import { formatDateParts, formatEventWhen } from "@/lib/dates";
import { fileUrl } from "@/server/adapters/storage";
import { requireUser } from "@/server/auth/session";
import type { EventWithStats } from "@/server/repositories/types";
import { eventService } from "@/server/services";
import { isEventOver } from "@/server/services/event.service";
import { ThemeHeroArt } from "@/themes/decorations";
import { InviteMini } from "@/themes/invite-mini";
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

  if (events.length === 0) return <EmptyState />;

  const meters = [
    { label: t("usageActive"), used: usage.active, max: usage.activeMax },
    { label: t("usageMonthly"), used: usage.monthly, max: usage.monthlyMax },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t("usageLabel")} className="grid gap-3 sm:grid-cols-2">
        {meters.map((meter, index) => (
          <div
            key={meter.label}
            className="flex animate-rise flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs"
            style={{ "--i": index } as CSSProperties}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{meter.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {t("usageOf", { used: meter.used, max: meter.max })}
              </span>
            </div>
            <Progress value={(meter.used / meter.max) * 100} aria-label={meter.label} />
          </div>
        ))}
      </section>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            {t("upcoming")}
            <span className="rounded-full bg-muted px-1.5 text-muted-foreground text-xs tabular-nums group-data-active:bg-brand-50">
              {upcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past">
            {t("past")}
            <span className="rounded-full bg-muted px-1.5 text-muted-foreground text-xs tabular-nums">
              {past.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length > 0 ? (
            <EventGrid events={upcoming} now={now} />
          ) : (
            <p className="rounded-3xl border border-dashed py-12 text-center text-muted-foreground">
              {t("emptyBody")}
            </p>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          {past.length > 0 ? (
            <EventGrid events={past} now={now} />
          ) : (
            <p className="rounded-3xl border border-dashed py-12 text-center text-muted-foreground">
              {t("emptyPastBody")}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function EmptyState() {
  const t = await getTranslations("dashboard");
  const quickStarts: { theme: ThemeId; label: string }[] = [
    { theme: "confetti", label: t("quickBirthday") },
    { theme: "wild", label: t("quickHike") },
    { theme: "midnight", label: t("quickGameNight") },
    { theme: "clean", label: t("quickMeetup") },
  ];
  const fanned: { theme: ThemeId; className: string }[] = [
    { theme: "wild", className: "-rotate-[10deg] -translate-x-[70%] translate-y-3" },
    { theme: "midnight", className: "rotate-[10deg] translate-x-[70%] translate-y-3" },
    { theme: "confetti", className: "z-10" },
  ];
  return (
    <div className="flex animate-rise flex-col items-center gap-8 rounded-[2rem] border bg-card px-6 py-14 text-center shadow-sm">
      <div className="relative flex h-52 w-full items-center justify-center" aria-hidden="true">
        {fanned.map((item) => (
          <div
            key={item.theme}
            className={`absolute w-32 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 ${item.className}`}
          >
            <InviteMini theme={item.theme} className="aspect-[3/4] w-full" />
          </div>
        ))}
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="heading text-headline">{t("emptyTitle")}</h2>
        <p className="text-muted-foreground">{t("emptyBody")}</p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard/events/new">
          <Plus aria-hidden="true" />
          {t("createEvent")}
        </Link>
      </Button>
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-sm">{t("emptyQuickStart")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {quickStarts.map((item) => (
            <Link
              key={item.theme}
              href={`/dashboard/events/new?theme=${item.theme}`}
              className="inline-flex h-10 items-center rounded-full border bg-background px-4 font-medium text-sm shadow-xs transition-colors hover:border-brand-200 hover:bg-brand-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResponseBar({ stats }: { stats: EventWithStats["stats"] }) {
  const total = Math.max(stats.total, 1);
  const segments = [
    { key: "going", value: stats.going, className: "bg-success" },
    { key: "maybe", value: stats.maybe, className: "bg-warning" },
    { key: "no", value: stats.notGoing, className: "bg-muted-foreground/30" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {segments.map((segment) =>
        segment.value > 0 ? (
          <span
            key={segment.key}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

async function EventGrid({ events, now }: { events: EventWithStats[]; now: Date }) {
  const t = await getTranslations("dashboard");
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <li
          key={event.id}
          className="group relative flex animate-rise flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0"
          style={{ "--i": Math.min(index, 6) } as CSSProperties}
        >
          <div className="relative">
            {event.coverImageKey ? (
              // biome-ignore lint/performance/noImgElement: covers are already resized WebP files
              <img
                src={fileUrl(event.coverImageKey)}
                alt=""
                className="aspect-[20/8] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <ThemeHeroArt
                theme={event.theme}
                date={formatDateParts(event.startsAt, event.timezone)}
                className="aspect-[20/8] w-full"
              />
            )}
            <div className="absolute start-3 top-3">
              <EventStatusBadges event={event} now={now} />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="heading text-lg leading-snug">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                >
                  {event.title}
                </Link>
              </h2>
              <p className="text-muted-foreground text-sm">
                {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <ResponseBar stats={event.stats} />
              <p className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {t("goingCount", { count: event.stats.guests })}
                </span>
                <span className="text-muted-foreground">
                  {t("responsesCount", { count: event.stats.total })}
                </span>
              </p>
            </div>
            <div className="relative z-10 mt-auto flex gap-2">
              <Button asChild size="sm" variant="secondary" className="flex-1">
                <Link href={`/dashboard/events/${event.id}`}>
                  {t("viewDashboard")}
                  <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="icon-sm" variant="outline">
                <Link href={`/${event.slug}`} target="_blank">
                  <ExternalLink aria-hidden="true" />
                  <span className="sr-only">{t("viewInvite")}</span>
                </Link>
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EventListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[5.25rem] rounded-2xl" />
        <Skeleton className="h-[5.25rem] rounded-2xl" />
      </div>
      <Skeleton className="h-11 w-56 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="overflow-hidden rounded-3xl border bg-card">
            <Skeleton className="aspect-[20/8] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
