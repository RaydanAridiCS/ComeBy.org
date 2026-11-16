import {
  ArrowRight,
  Ban,
  CalendarCheck2,
  Clock,
  Lock,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { StatusMessage } from "@/components/layout/status-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";
import { getPublicEvent } from "@/features/events/queries";
import { type EventState, eventState } from "@/features/events/state";
import { CalendarMenu } from "@/features/rsvp/components/calendar-menu";
import { Countdown } from "@/features/rsvp/components/countdown";
import { GuestSection } from "@/features/rsvp/components/guest-section";
import { InviteCard } from "@/features/rsvp/components/invite-card";
import { ReportLauncher } from "@/features/rsvp/components/report-launcher";
import { readRsvpCredential } from "@/features/rsvp/cookies";
import { clientMessages, INVITE_NAMESPACES } from "@/i18n/client-messages";
import { googleCalendarUrl, mapsUrl, outlookCalendarUrl } from "@/lib/calendar";
import {
  eventEndInstant,
  formatDateParts,
  formatEventDay,
  formatEventTime,
  formatTimestamp,
  formatTimeZoneLabel,
  keepDayTogether,
} from "@/lib/dates";
import { eventUrl } from "@/lib/share";
import { validateSlug } from "@/lib/slug";
import { fileUrl } from "@/server/adapters/storage";
import type { EventRecord } from "@/server/repositories/types";
import { rsvpBlockReason } from "@/server/services/rsvp.service";
import { THEME_TOKENS, themeStyle } from "@/themes";
import { ThemeBackdrop } from "@/themes/decorations";

const CHANGE_KEYS = new Set(["time", "location", "title", "details"]);

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event) {
    // Same choice as not-found.tsx: an address that could never be an invite is just a missing page.
    const t = await getTranslations();
    const couldBeInvite = validateSlug(slug.toLowerCase()) === null;
    return {
      title: couldBeInvite ? t("eventPage.notFoundTitle") : t("notFound.title"),
      robots: { index: false },
    };
  }
  if (event.hiddenAt) {
    const t = await getTranslations("eventPage");
    return { title: t("hiddenTitle"), robots: { index: false } };
  }
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

/** The notice at the top of an invite that isn't taking answers. Said once, here. */
function StateBanner({
  surface,
  icon: Icon,
  iconClassName,
  title,
  body,
}: {
  surface: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  body: string | null;
}) {
  return (
    <div
      data-surface={surface}
      className="invite-card flex animate-rise items-start gap-3.5 rounded-3xl p-4 shadow-lg"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <p className="font-semibold">{title}</p>
        {body ? <p className="whitespace-pre-line text-invite-muted text-sm">{body}</p> : null}
      </div>
    </div>
  );
}

async function Banners({ event, state }: { event: EventRecord; state: EventState }) {
  const t = await getTranslations();
  const surface = THEME_TOKENS[event.theme].surface;
  if (state === "cancelled") {
    return (
      <StateBanner
        surface={surface}
        icon={Ban}
        iconClassName="bg-[#d92d4b] text-white"
        title={t("eventPage.cancelledBanner")}
        body={event.cancelMessage}
      />
    );
  }
  if (state === "ended") {
    return (
      <StateBanner
        surface={surface}
        icon={CalendarCheck2}
        iconClassName="bg-invite-accent text-invite-accent-fg"
        title={t("eventPage.ended")}
        body={t("eventPage.endedBody")}
      />
    );
  }
  if (state === "closed") {
    return (
      <StateBanner
        surface={surface}
        icon={Lock}
        iconClassName="bg-invite-accent text-invite-accent-fg"
        title={t("eventPage.closedBanner")}
        body={
          !event.rsvpClosed && event.rsvpDeadline
            ? t("eventPage.closedByDeadline", {
                date: keepDayTogether(formatEventDay(event.rsvpDeadline, event.timezone)),
              })
            : t("eventPage.closedBody")
        }
      />
    );
  }
  if (event.lastNotableUpdateAt && event.lastNotableUpdateSummary) {
    const changes = event.lastNotableUpdateSummary
      .split(",")
      .filter((change) => CHANGE_KEYS.has(change))
      .map((change) =>
        t(`eventPage.changed.${change as "time" | "location" | "title" | "details"}`),
      );
    if (changes.length > 0) {
      // "The time and the place changed", then when, on a quieter line.
      const what = new Intl.ListFormat(await getLocale(), { type: "conjunction" }).format(changes);
      return (
        <div
          data-surface={surface}
          className="invite-card flex animate-rise items-center gap-3 rounded-3xl py-2 ps-2 pe-4 text-sm shadow-md"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-invite-accent text-invite-accent-fg">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <p className="flex flex-col">
            <span className="font-semibold">
              {t("eventPage.updatedBanner", {
                what: `${what.charAt(0).toLocaleUpperCase()}${what.slice(1)}`,
              })}
            </span>
            <span className="text-invite-muted text-xs">
              {formatTimestamp(event.lastNotableUpdateAt, event.timezone)}
            </span>
          </p>
        </div>
      );
    }
  }
  return null;
}

/**
 * "Please respond by …" under the date, for a guest who hasn't answered while answers are
 * open. Reads the clock and the guest's cookie, so it renders per request.
 */
async function DeadlineNote({ event }: { event: EventRecord }) {
  if (!event.rsvpDeadline) return null;
  await connection();
  if (rsvpBlockReason(event, new Date()) !== null) return null;
  if (await readRsvpCredential(event.id)) return null;
  const t = await getTranslations("eventPage");
  return (
    <p className="mt-1 flex items-center gap-1.5 font-semibold text-(--invite-accent-ink) text-sm">
      <Clock className="size-3.5 shrink-0" aria-hidden="true" />
      {t("deadline", {
        date: keepDayTogether(formatEventDay(event.rsvpDeadline, event.timezone)),
      })}
    </p>
  );
}

function GuestSectionSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="invite-chip h-9 w-24 animate-pulse rounded-full" />
        <div className="invite-chip h-5 w-32 animate-pulse rounded-full" />
      </div>
      <div className="flex flex-col items-center gap-5 border-(--invite-card-border) border-t pt-6">
        <div className="invite-chip h-8 w-52 animate-pulse rounded-full" />
        <div className="grid w-full grid-cols-3 gap-2">
          {["going", "maybe", "no"].map((key) => (
            <div key={key} className="invite-chip h-[4.75rem] animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function Invite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event) notFound();
  const t = await getTranslations();

  if (event.hiddenAt) {
    return (
      <StatusPage>
        <StatusMessage title={t("eventPage.hiddenTitle")} body={t("eventPage.hiddenBody")}>
          <Button asChild size="lg" variant="outline">
            <Link href="/" prefetch={false}>
              {t("notFound.home")}
            </Link>
          </Button>
        </StatusMessage>
      </StatusPage>
    );
  }

  // Cancelled, ended and closed change what the invite offers, and "ended" depends on the clock.
  await connection();
  const state = eventState(event, new Date());
  const over = state === "ended" || state === "cancelled";

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
  const theme = THEME_TOKENS[event.theme];
  const cancelled = state === "cancelled";

  return (
    <div className="invite-page relative min-h-dvh" style={themeStyle(event.theme)}>
      <ThemeBackdrop theme={event.theme} fixed />
      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto flex w-full max-w-[34rem] flex-col gap-4 px-3 pt-4 pb-[calc(2.5rem+var(--safe-bottom))] sm:px-4 sm:pt-12 sm:pb-[calc(4rem+var(--safe-bottom))]"
      >
        <Banners event={event} state={state} />
        <InviteCard
          theme={event.theme}
          title={event.title}
          hostName={event.hostName}
          coverUrl={event.coverImageKey ? fileUrl(event.coverImageKey) : null}
          heroDate={formatDateParts(event.startsAt, event.timezone)}
          dayLabel={formatEventDay(event.startsAt, event.timezone)}
          timeLabel={`${formatEventTime(event.startsAt, event.timezone)}${
            event.endsAt ? ` – ${formatEventTime(event.endsAt, event.timezone)}` : ""
          }`}
          zoneLabel={formatTimeZoneLabel(event.startsAt, event.timezone)}
          locationType={event.locationType}
          locationName={event.locationName}
          locationAddress={event.locationAddress}
          // Directions, the meeting link, the countdown and the calendar are for an event that's on.
          mapsHref={
            location && !over
              ? event.locationAddress?.startsWith("https://")
                ? event.locationAddress
                : mapsUrl(location)
              : null
          }
          onlineHref={over ? null : event.onlineUrl}
          description={event.description}
          cancelled={cancelled}
          answersOpen={state === "live"}
          countdown={
            over ? null : (
              <Countdown
                startsAt={event.startsAt.toISOString()}
                endsAt={endInstant.toISOString()}
              />
            )
          }
          calendar={over ? null : <CalendarMenu links={calendarLinks} />}
          whenNote={
            event.rsvpDeadline && state === "live" ? (
              <Suspense fallback={null}>
                <DeadlineNote event={event} />
              </Suspense>
            ) : null
          }
          className="animate-rise"
        >
          <Suspense fallback={<GuestSectionSkeleton />}>
            <GuestSection event={event} calendarLinks={calendarLinks} />
          </Suspense>
        </InviteCard>

        <footer
          data-surface={theme.surface}
          className="invite-card flex animate-rise flex-col items-center gap-2.5 rounded-3xl px-5 py-5 text-center [--i:2]"
        >
          {/* No prefetch: it made every guest's phone download the landing page and its heading font. */}
          <Link
            href="/"
            prefetch={false}
            className="invite-focus group inline-flex min-h-11 items-center gap-2.5 rounded-full font-semibold"
          >
            <span className="flex size-8 items-center justify-center rounded-[30%] bg-invite-accent text-invite-accent-fg shadow-sm">
              <LogoMark className="size-5" />
            </span>
            {t("eventPage.makeYourOwn")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <p className="text-invite-muted text-sm">{t("eventPage.makeYourOwnBody")}</p>
          <ReportLauncher eventId={event.id} />
        </footer>
      </main>
    </div>
  );
}

function InviteSkeleton() {
  return (
    <div className="min-h-dvh bg-muted/60" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4 px-3 pt-4 sm:px-4 sm:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-card shadow-lg">
          <div className="aspect-[20/9] w-full animate-shimmer bg-[linear-gradient(100deg,var(--muted)_30%,color-mix(in_oklch,var(--muted),white_70%)_50%,var(--muted)_70%)] bg-size-[200%_100%] motion-reduce:animate-none" />
          <div className="flex flex-col gap-4 p-5 sm:p-8">
            <div className="h-5 w-36 animate-pulse rounded-full bg-muted" />
            <div className="h-11 w-4/5 animate-pulse rounded-xl bg-muted" />
            <div className="h-8 w-44 animate-pulse rounded-full bg-muted" />
            <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function InvitePage({ params }: PageProps<"/[slug]">) {
  return (
    <NextIntlClientProvider messages={await clientMessages(INVITE_NAMESPACES)}>
      <Suspense fallback={<InviteSkeleton />}>
        <Invite params={params} />
      </Suspense>
    </NextIntlClientProvider>
  );
}
