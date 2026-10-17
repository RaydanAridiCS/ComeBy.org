"use client";

import { BellRing, Copy, Megaphone, MessageCircle, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/use-copy";
import { whatsappShareUrl } from "@/lib/share";
import type { DashboardData } from "../dto";

const CHANGE_KEYS = ["time", "location", "title", "details"] as const;
type ChangeKey = (typeof CHANGE_KEYS)[number];

/** Link sharing plus ready-made messages for the host's WhatsApp group. */
export function ShareCard({ event }: { event: DashboardData["event"] }) {
  const t = useTranslations("eventDashboard");
  const tChanges = useTranslations("changes");
  const copy = useCopy();

  const inviteMessage = t("shareMessage", { title: event.title, when: event.when, url: event.url });
  const nudgeMessage = t("nudgeMessage", { title: event.title, url: event.url });

  const changes = (event.lastNotableUpdateSummary ?? "")
    .split(",")
    .filter((change): change is ChangeKey => CHANGE_KEYS.includes(change as ChangeKey))
    .map((change) => tChanges(change));
  const updateMessage =
    event.status === "cancelled"
      ? t("cancelShareMessage", {
          title: event.title,
          message: event.cancelMessage ? ` ${event.cancelMessage}` : "",
          url: event.url,
        })
      : changes.length > 0
        ? t("updateMessage", {
            title: event.title,
            summary: `${changes.join(", ")} → ${event.when}`,
            url: event.url,
          })
        : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="font-semibold text-lg">{t("shareTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("shareBody")}</p>
      </div>
      <button
        type="button"
        onClick={() => copy(event.url)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-start font-medium hover:bg-muted"
      >
        <span className="truncate">{event.displayUrl}</span>
        <Copy className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t("copyLink")}</span>
      </button>
      <div className="grid grid-cols-1 gap-2">
        <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
          <a href={whatsappShareUrl(inviteMessage)} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            {t("shareWhatsApp")}
          </a>
        </Button>
        <Button variant="outline" onClick={() => copy(event.url)}>
          <Copy />
          {t("copyLink")}
        </Button>
        <Button asChild variant="outline">
          <a href={`/${event.slug}/qr`} download={`${event.slug}-qr.png`}>
            <QrCode />
            {t("downloadQr")}
          </a>
        </Button>
      </div>
      {updateMessage ? (
        <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="flex items-center gap-2 font-medium text-sm">
            <Megaphone className="size-4" aria-hidden="true" /> {t("updateMessageTitle")}
          </p>
          <p className="text-sm opacity-90">{t("updateMessageBody")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => copy(updateMessage)}>
              <Copy />
              {t("copyUpdateMessage")}
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={whatsappShareUrl(updateMessage)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                {t("shareWhatsApp")}
              </a>
            </Button>
          </div>
        </div>
      ) : null}
      {event.status === "active" && !event.over ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => copy(nudgeMessage)}>
          <BellRing />
          {t("copyNudgeMessage")}
        </Button>
      ) : null}
    </section>
  );
}
