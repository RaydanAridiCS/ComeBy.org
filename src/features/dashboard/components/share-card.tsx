"use client";

import { BellRing, Check, Copy, Download, Megaphone, MessageCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const tCommon = useTranslations("common");
  const copy = useCopy();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(event.url);
      setCopied(true);
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    }
  }

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
    <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="heading text-xl">{t("shareTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("shareBody")}</p>
      </div>

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
            <AnimatePresence initial={false} mode="popLayout">
              {copied ? (
                <m.span
                  key="copied"
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  className="flex items-center gap-1.5 text-success-ink"
                >
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  {t("copied")}
                </m.span>
              ) : (
                <m.span
                  key="copy"
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {t("copyLink")}
                </m.span>
              )}
            </AnimatePresence>
          </span>
        </button>
      </div>

      <Button
        asChild
        className="bg-[#1fae55] text-white shadow-[0_6px_16px_-6px_#1fae55] hover:bg-[#178f45]"
      >
        <a href={whatsappShareUrl(inviteMessage)} target="_blank" rel="noopener noreferrer">
          <MessageCircle />
          {t("shareWhatsApp")}
        </a>
      </Button>

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

      {updateMessage ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-warning-soft p-4 text-warning-ink ring-1 ring-warning/30 ring-inset">
          <p className="flex items-center gap-2 font-semibold text-sm">
            <Megaphone className="size-4" aria-hidden="true" /> {t("updateMessageTitle")}
          </p>
          <p className="text-sm">{t("updateMessageBody")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(updateMessage)}>
              <Copy />
              {t("copyUpdateMessage")}
            </Button>
            <Button asChild size="sm" variant="outline">
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
