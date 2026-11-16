"use client";

import {
  BellRing,
  CalendarCheck2,
  Copy,
  Download,
  LockOpen,
  Megaphone,
  MessageCircle,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/use-copy";
import { LIMITS } from "@/config/limits";
import { whatsappShareUrl } from "@/lib/share";
import type { DashboardData } from "../dto";
import { DuplicateButton, ReopenRsvpsButton } from "./event-actions";
import { CopyLinkLabel, useInviteShare, WhatsAppButton } from "./share-actions";

const CHANGE_KEYS = ["time", "location", "title", "details"] as const;
type ChangeKey = (typeof CHANGE_KEYS)[number];

type ShareEvent = DashboardData["event"];

/**
 * What the host can do with the link, by the event's state: share it while it's live,
 * keep the link but say answers are off when closed, tell the group when it's cancelled,
 * and plan the next one when it has ended. A hidden event has nothing to share.
 */
export function ShareCard({ event }: { event: ShareEvent }) {
  switch (event.state) {
    case "live":
      return <LiveShareCard event={event} />;
    case "closed":
      return <ClosedShareCard event={event} />;
    case "cancelled":
      return <CancelledShareCard event={event} />;
    case "ended":
      return <EndedCard event={event} />;
    case "hidden":
      return null;
  }
}

function Card({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="heading text-xl">{title}</h2>
        <p className="text-pretty text-muted-foreground text-sm">{body}</p>
      </div>
      {children}
    </section>
  );
}

function CopyLinkField({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  const { copied, copyLink } = useInviteShare(event);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{t("linkLabel")}</span>
      <button
        type="button"
        onClick={copyLink}
        className="group flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border bg-muted/50 ps-4 pe-1.5 text-start font-medium outline-none transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span className="truncate">{event.displayUrl}</span>
        <span
          className="relative flex h-9 shrink-0 items-center gap-1.5 overflow-hidden rounded-xl bg-card px-3 font-semibold text-sm shadow-xs"
          aria-live="polite"
        >
          <CopyLinkLabel copied={copied} />
        </span>
      </button>
    </div>
  );
}

function QrCode({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  return (
    <div className="flex items-center gap-4 rounded-2xl border p-3">
      {/* biome-ignore lint/performance/noImgElement: the QR code is a small generated PNG */}
      <img
        src={`/${event.slug}/qr`}
        alt={t("qrAlt")}
        width={72}
        height={72}
        loading="lazy"
        className="size-[72px] shrink-0 rounded-lg bg-white"
      />
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-sm">{t("downloadQr")}</p>
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href={`/${event.slug}/qr`} download={`${event.slug}-qr.png`}>
            <Download />
            {t("qrDownload")}
          </a>
        </Button>
      </div>
    </div>
  );
}

/** A ready-made message for the host's group, with copy and WhatsApp buttons. */
function PasteMessage({
  title,
  body,
  message,
  copyLabel,
}: {
  title: string;
  body: string;
  message: string;
  copyLabel: string;
}) {
  const t = useTranslations("eventDashboard");
  const copy = useCopy();
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-warning-soft p-4 text-warning-ink ring-1 ring-warning/30 ring-inset">
      <p className="flex items-center gap-2 font-semibold text-sm">
        <Megaphone className="size-4" aria-hidden="true" /> {title}
      </p>
      <p className="whitespace-pre-line break-words text-sm">{body}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy(message)}>
          <Copy />
          {copyLabel}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            {t("shareWhatsApp")}
          </a>
        </Button>
      </div>
    </div>
  );
}

function LiveShareCard({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  const tChanges = useTranslations("changes");
  const copy = useCopy();
  const { whatsappUrl } = useInviteShare(event);

  const changes = (event.lastNotableUpdateSummary ?? "")
    .split(",")
    .filter((change): change is ChangeKey => CHANGE_KEYS.includes(change as ChangeKey))
    .map((change) => tChanges(change));
  const updateMessage =
    changes.length > 0
      ? t("updateMessage", {
          title: event.title,
          summary: `${changes.join(", ")} → ${event.when}`,
          url: event.url,
        })
      : null;

  return (
    <Card title={t("shareTitle")} body={t("shareBody")}>
      <CopyLinkField event={event} />
      <WhatsAppButton href={whatsappUrl} />
      <QrCode event={event} />
      {updateMessage ? (
        <PasteMessage
          title={t("updateMessageTitle")}
          body={t("updateMessageBody")}
          message={updateMessage}
          copyLabel={t("copyUpdateMessage")}
        />
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => copy(t("nudgeMessage", { title: event.title, url: event.url }))}
      >
        <BellRing />
        {t("copyNudgeMessage")}
      </Button>
    </Card>
  );
}

/** The link still shows the invite, so it can still be copied; answers are off. */
function ClosedShareCard({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  const byHost = event.closedBy === "host";
  return (
    <Card title={t("closedTitle")} body={byHost ? t("closedByHost") : t("closedByDeadline")}>
      {byHost ? (
        <ReopenRsvpsButton eventId={event.id} className="self-start">
          <LockOpen />
          {t("reopenRsvps")}
        </ReopenRsvpsButton>
      ) : (
        <Button asChild variant="outline" className="self-start">
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Pencil />
            {t("changeDeadline")}
          </Link>
        </Button>
      )}
      <CopyLinkField event={event} />
    </Card>
  );
}

/** Only the "it's off" message to paste: nothing else about the link is useful now. */
function CancelledShareCard({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  const message = t("cancelShareMessage", {
    title: event.title,
    message: event.cancelMessage ? ` ${event.cancelMessage}` : "",
    url: event.url,
  });
  return (
    <Card title={t("cancelledTitle")} body={t("cancelledBody")}>
      <PasteMessage
        title={t("readyToPaste")}
        body={message}
        message={message}
        copyLabel={t("copyMessage")}
      />
    </Card>
  );
}

/** Nothing to share once it's over: start the next one, and keep the list before the purge. */
function EndedCard({ event }: { event: ShareEvent }) {
  const t = useTranslations("eventDashboard");
  return (
    <Card title={t("endedTitle")} body={t("endedBody")}>
      <DuplicateButton eventId={event.id} variant="outline" className="self-start">
        <CalendarCheck2 />
        {t("duplicateForNextTime")}
      </DuplicateButton>
      <div className="flex flex-col gap-3 rounded-2xl border p-4">
        <p className="text-pretty text-muted-foreground text-sm">
          {t("endedPurge", { days: LIMITS.guestDataRetentionDays })}
        </p>
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href={`/api/events/${event.id}/export`} download>
            <Download />
            {t("exportCsv")}
          </a>
        </Button>
      </div>
    </Card>
  );
}
