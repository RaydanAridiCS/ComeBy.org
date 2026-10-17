import { ArrowRight, Ban, EyeOff, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { getPublicEvent } from "@/features/events/queries";
import { CalendarMenu } from "@/features/rsvp/components/calendar-menu";
import { Countdown } from "@/features/rsvp/components/countdown";
import { GuestSection } from "@/features/rsvp/components/guest-section";
import { InviteCard } from "@/features/rsvp/components/invite-card";
import { ReportLauncher } from "@/features/rsvp/components/report-launcher";
import { clientMessages, INVITE_NAMESPACES } from "@/i18n/client-messages";
import { googleCalendarUrl, mapsUrl, outlookCalendarUrl } from "@/lib/calendar";
import {
  eventEndInstant,
  formatDateParts,
  formatEventDay,
  formatEventTime,
  formatTimestamp,
  formatTimeZoneLabel,
} from "@/lib/dates";
import { eventUrl } from "@/lib/share";
import { fileUrl } from "@/server/adapters/storage";
import type { EventRecord } from "@/server/repositories/types";
import { THEME_TOKENS, themeStyle } from "@/themes";
import { ThemeBackdrop } from "@/themes/decorations";

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
  const surface = THEME_TOKENS[event.theme].surface;
  if (event.status === "cancelled") {
    return (
      <div
        data-surface={surface}
        className="invite-card flex animate-rise items-start gap-3.5 rounded-3xl p-4 shadow-lg"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#d92d4b] text-white">
          <Ban className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <p className="font-semibold">{t("eventPage.cancelledBanner")}</p>
          {event.cancelMessage ? (
            <p className="whitespace-pre-line text-invite-muted text-sm">{event.cancelMessage}</p>
          ) : null}
        </div>
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
        <div
          data-surface={surface}
          className="invite-card flex animate-rise items-center gap-3 rounded-full py-2 ps-2 pe-4 text-sm shadow-md"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-invite-accent text-invite-accent-fg">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
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
  const t = await getTranslations("eventPage");

  if (event.hiddenAt) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <EyeOff className="size-6" aria-hidden="true" />
        </span>
        <h1 className="heading text-2xl">{t("hiddenTitle")}</h1>
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
  const theme = THEME_TOKENS[event.theme];
  const cancelled = event.status === "cancelled";

  return (
    <div className="invite-page relative min-h-dvh" style={themeStyle(event.theme)}>
      <ThemeBackdrop theme={event.theme} fixed />
      <main className="relative mx-auto flex w-full max-w-[34rem] flex-col gap-4 px-3 pt-4 pb-10 sm:px-4 sm:pt-12 sm:pb-16">
        <Banners event={event} />
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
          mapsHref={
            location
              ? event.locationAddress?.startsWith("https://")
                ? event.locationAddress
                : mapsUrl(location)
              : null
          }
          onlineHref={event.status === "active" ? event.onlineUrl : null}
          description={event.description}
          cancelled={cancelled}
          countdown={
            cancelled ? null : (
              <Countdown
                startsAt={event.startsAt.toISOString()}
                endsAt={endInstant.toISOString()}
              />
            )
          }
          calendar={cancelled ? null : <CalendarMenu links={calendarLinks} />}
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
          <Link
            href="/"
            className="invite-focus group inline-flex items-center gap-2.5 rounded-full font-semibold"
          >
            <span className="flex size-8 items-center justify-center rounded-[30%] bg-invite-accent text-invite-accent-fg shadow-sm">
              <LogoMark className="size-5" />
            </span>
            {t("makeYourOwn")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <p className="text-invite-muted text-sm">{t("makeYourOwnBody")}</p>
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
