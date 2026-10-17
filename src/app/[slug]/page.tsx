import { CalendarDays, Clock, ExternalLink, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicEvent } from "@/features/events/queries";
import { Countdown } from "@/features/rsvp/components/countdown";
import { GuestSection } from "@/features/rsvp/components/guest-section";
import { ReportDialog } from "@/features/rsvp/components/report-dialog";
import { googleCalendarUrl, mapsUrl, outlookCalendarUrl } from "@/lib/calendar";
import {
  eventEndInstant,
  formatEventDay,
  formatEventTime,
  formatTimestamp,
  formatTimeZoneLabel,
} from "@/lib/dates";
import { eventUrl } from "@/lib/share";
import { fileUrl } from "@/server/adapters/storage";
import type { EventRecord } from "@/server/repositories/types";
import { themeStyle } from "@/themes";
import { ThemeDecorations } from "@/themes/decorations";

const CHANGE_KEYS = new Set(["time", "location", "title", "details"]);

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event || event.hiddenAt) return { robots: { index: false } };
  const t = await getTranslations("eventPage");
  const when = `${formatEventDay(event.startsAt, event.timezone)} · ${formatEventTime(event.startsAt, event.timezone)}`;
  const description = `${when} · ${t("hostedBy", { name: event.hostName })}`;
  return {
    title: event.title,
    description,
    // Invites are private by default: keep them out of search engines.
    robots: { index: false, follow: false },
    alternates: { canonical: eventUrl(event.slug) },
    openGraph: { title: event.title, description, url: eventUrl(event.slug), type: "website" },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

function locationText(event: EventRecord): string | null {
  return [event.locationName, event.locationAddress].filter(Boolean).join(", ") || null;
}

async function Banners({ event }: { event: EventRecord }) {
  const t = await getTranslations();
  if (event.status === "cancelled") {
    return (
      <div className="rounded-2xl bg-red-600 px-4 py-3 text-center text-white">
        <p className="font-semibold">{t("eventPage.cancelledBanner")}</p>
        {event.cancelMessage ? (
          <p className="mt-1 text-sm opacity-90">{event.cancelMessage}</p>
        ) : null}
      </div>
    );
  }
  if (event.lastNotableUpdateAt && event.lastNotableUpdateSummary) {
    const changes = event.lastNotableUpdateSummary
      .split(",")
      .filter((change) => CHANGE_KEYS.has(change))
      .map((change) => t(`changes.${change as "time" | "location" | "title" | "details"}`));
    if (changes.length > 0) {
      return (
        <div className="rounded-2xl bg-invite-accent px-4 py-2.5 text-center text-invite-accent-fg text-sm">
          {t("eventPage.updatedBanner", {
            when: formatTimestamp(event.lastNotableUpdateAt, event.timezone),
            summary: changes.join(", "),
          })}
        </div>
      );
    }
  }
  return null;
}

async function Invite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event) notFound();
  const t = await getTranslations("eventPage");

  if (event.hiddenAt) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-24 text-center">
        <h1 className="font-bold text-2xl">{t("hiddenTitle")}</h1>
        <p className="text-muted-foreground">{t("hiddenBody")}</p>
      </div>
    );
  }

  const location = locationText(event);
  const url = eventUrl(event.slug);
  const calendarInput = {
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.locationType === "online" ? event.onlineUrl : location,
    url,
    uid: event.id,
  };
  const calendarLinks = {
    google: googleCalendarUrl(calendarInput),
    outlook: outlookCalendarUrl(calendarInput),
    ics: `/${event.slug}/calendar.ics`,
  };
  const endInstant = eventEndInstant(event.startsAt, event.endsAt);

  return (
    <div className="invite-page relative min-h-dvh overflow-hidden" style={themeStyle(event.theme)}>
      <ThemeDecorations theme={event.theme} />
      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
        <Banners event={event} />
        <article className="invite-card overflow-hidden rounded-3xl shadow-xl">
          {event.coverImageKey ? (
            // biome-ignore lint/performance/noImgElement: covers are already resized WebP files
            <img
              src={fileUrl(event.coverImageKey)}
              alt=""
              className="aspect-video w-full object-cover"
              fetchPriority="high"
            />
          ) : null}
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            <header className="flex flex-col gap-2">
              <p className="text-invite-muted text-sm">{t("hostedBy", { name: event.hostName })}</p>
              <h1 className="invite-heading text-balance font-bold text-3xl leading-tight sm:text-4xl">
                {event.title}
              </h1>
              <Countdown
                startsAt={event.startsAt.toISOString()}
                endsAt={endInstant.toISOString()}
              />
            </header>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <CalendarDays
                  className="mt-0.5 size-5 shrink-0 text-invite-accent"
                  aria-hidden="true"
                />
                <p className="font-semibold">{formatEventDay(event.startsAt, event.timezone)}</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-invite-accent" aria-hidden="true" />
                <p>
                  {formatEventTime(event.startsAt, event.timezone)}
                  {event.endsAt ? ` – ${formatEventTime(event.endsAt, event.timezone)}` : ""}{" "}
                  <span className="text-invite-muted text-sm">
                    ({formatTimeZoneLabel(event.startsAt, event.timezone)})
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                {event.locationType === "online" ? (
                  <Globe className="mt-0.5 size-5 shrink-0 text-invite-accent" aria-hidden="true" />
                ) : (
                  <MapPin
                    className="mt-0.5 size-5 shrink-0 text-invite-accent"
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col gap-1">
                  {event.locationType === "tbd" ? (
                    <span className="text-invite-muted">{t("locationTbd")}</span>
                  ) : event.locationType === "online" ? (
                    <>
                      <span>{t("online")}</span>
                      {event.onlineUrl && event.status === "active" ? (
                        <a
                          href={event.onlineUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 font-semibold text-invite-accent text-sm underline-offset-4 hover:underline"
                        >
                          {t("joinOnline")} <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {event.locationName ? (
                        <span className="font-semibold">{event.locationName}</span>
                      ) : null}
                      {event.locationAddress ? (
                        <span className="text-invite-muted text-sm">{event.locationAddress}</span>
                      ) : null}
                      {location ? (
                        <a
                          href={
                            event.locationAddress?.startsWith("https://")
                              ? event.locationAddress
                              : mapsUrl(location)
                          }
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 font-semibold text-invite-accent text-sm underline-offset-4 hover:underline"
                        >
                          {t("openInMaps")} <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {event.description ? (
              <p className="whitespace-pre-line break-words leading-relaxed">{event.description}</p>
            ) : null}

            <Suspense
              fallback={
                <Skeleton className="h-48 rounded-2xl bg-[color:var(--invite-accent-soft)]" />
              }
            >
              <GuestSection event={event} calendarLinks={calendarLinks} />
            </Suspense>
          </div>
        </article>

        <footer className="flex flex-col items-center gap-3 py-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-invite-card px-4 py-2 font-semibold text-sm shadow-sm"
          >
            <LogoMark className="size-5 text-invite-accent" />
            {t("makeYourOwn")}
          </Link>
          <p className="text-invite-muted text-xs">{t("makeYourOwnBody")}</p>
          <ReportDialog eventId={event.id} />
        </footer>
      </div>
    </div>
  );
}

function InviteSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-10">
      <Skeleton className="aspect-video w-full rounded-3xl" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export default function InvitePage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <Invite params={params} />
    </Suspense>
  );
}
