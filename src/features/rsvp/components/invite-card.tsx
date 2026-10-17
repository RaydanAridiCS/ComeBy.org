import { CalendarDays, ExternalLink, Globe, type LucideIcon, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ThemeId } from "@/features/events/schema";
import { cn } from "@/lib/utils";
import { THEME_TOKENS } from "@/themes";
import { type HeroDate, ThemeHeroArt } from "@/themes/decorations";

/** Everything an invite shows, as plain display strings (so previews can use it too). */
export type InviteCardData = {
  theme: ThemeId;
  title: string;
  hostName: string;
  coverUrl: string | null;
  heroDate: HeroDate;
  /** "Friday, October 23" */
  dayLabel: string;
  /** "8:00 PM – 11:00 PM" */
  timeLabel: string;
  /** "GMT+3" */
  zoneLabel: string;
  locationType: "physical" | "online" | "tbd";
  locationName: string | null;
  locationAddress: string | null;
  mapsHref: string | null;
  onlineHref: string | null;
  description: string | null;
};

type InviteCardProps = InviteCardData & {
  /** The real invite uses h1; previews inside other pages use a paragraph. */
  titleAs?: "h1" | "p";
  countdown?: ReactNode;
  /** Add-to-calendar control, shown in the "When" row. */
  calendar?: ReactNode;
  cancelled?: boolean;
  /** The live part: guest list and RSVP form. */
  children?: ReactNode;
  className?: string;
};

function DetailRow({
  icon: Icon,
  label,
  primary,
  secondary,
  action,
}: {
  icon: LucideIcon;
  label: string;
  primary: ReactNode;
  secondary?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 p-4">
      <span className="invite-chip flex size-11 shrink-0 items-center justify-center rounded-xl text-(--invite-accent-ink)">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold text-[0.6875rem] text-invite-muted uppercase tracking-[0.12em]">
          {label}
        </p>
        <div className="break-words font-semibold text-[1.0625rem] leading-snug">{primary}</div>
        {secondary ? (
          <div className="break-words text-invite-muted text-sm">{secondary}</div>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * The invitation itself: cover or theme art, title, when/where and details.
 * Shared by the public invite page, the event-form live preview and the landing page.
 */
export function InviteCard({
  titleAs: Title = "h1",
  countdown,
  calendar,
  cancelled = false,
  children,
  className,
  ...invite
}: InviteCardProps) {
  const t = useTranslations("eventPage");
  const theme = THEME_TOKENS[invite.theme];
  const initial = invite.hostName.trim().charAt(0).toUpperCase() || "?";

  const where =
    invite.locationType === "online" ? (
      <DetailRow
        icon={Globe}
        label={t("where")}
        primary={t("online")}
        action={
          invite.onlineHref ? (
            <a
              href={invite.onlineHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="invite-link invite-focus inline-flex min-h-6 items-center gap-1 rounded text-sm"
            >
              {t("joinOnline")} <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null
        }
      />
    ) : invite.locationType === "tbd" ? (
      <DetailRow icon={MapPin} label={t("where")} primary={t("locationTbd")} />
    ) : (
      <DetailRow
        icon={MapPin}
        label={t("where")}
        primary={invite.locationName || invite.locationAddress || t("locationTbd")}
        secondary={invite.locationName ? invite.locationAddress : null}
        action={
          invite.mapsHref ? (
            <a
              href={invite.mapsHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="invite-link invite-focus inline-flex min-h-6 items-center gap-1 rounded text-sm"
            >
              {t("openInMaps")} <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null
        }
      />
    );

  return (
    <article
      data-surface={theme.surface}
      className={cn(
        "invite-card invite-elevated relative overflow-hidden rounded-[2rem]",
        cancelled && "saturate-[0.3]",
        className,
      )}
    >
      {invite.coverUrl ? (
        <div className="relative">
          {/* biome-ignore lint/performance/noImgElement: covers are already resized WebP files */}
          <img
            src={invite.coverUrl}
            alt=""
            className="aspect-[16/10] w-full object-cover"
            fetchPriority="high"
          />
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,var(--invite-card),transparent)]" />
        </div>
      ) : (
        <ThemeHeroArt
          theme={invite.theme}
          date={invite.heroDate}
          className="aspect-[20/9] w-full"
        />
      )}

      <div className="relative flex flex-col gap-6 px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
        <header className="flex flex-col gap-3">
          <p className="flex items-center gap-2.5 text-sm">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-invite-accent font-bold text-invite-accent-fg text-sm shadow-sm"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="text-invite-muted">{t("hostedBy", { name: invite.hostName })}</span>
          </p>
          <Title className="invite-heading invite-title">{invite.title}</Title>
          {countdown}
        </header>

        <div className="divide-y divide-(--invite-card-border) overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--invite-accent-soft)_40%,transparent)] ring-(--invite-card-border) ring-1">
          <DetailRow
            icon={CalendarDays}
            label={t("when")}
            primary={invite.dayLabel}
            secondary={`${invite.timeLabel} · ${invite.zoneLabel}`}
            action={calendar}
          />
          {where}
        </div>

        {invite.description ? (
          <p className="whitespace-pre-line text-pretty break-words text-[1.0625rem] leading-relaxed">
            {invite.description}
          </p>
        ) : null}

        {children}
      </div>
    </article>
  );
}
