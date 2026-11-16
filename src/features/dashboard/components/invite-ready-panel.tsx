"use client";

import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ThemeId } from "@/features/events/schema";
import { InviteMini } from "@/themes/invite-mini";
import type { DashboardData } from "../dto";
import { CopyLinkLabel, useInviteShare, WhatsAppButton } from "./share-actions";

/**
 * Shown once, right after a host creates an event: the invite is ready, so the next
 * tap should be "send it to the group". It sits above everything else on the page.
 */
export function InviteReadyPanel({
  event,
  theme,
  onShare,
  onDismiss,
}: {
  event: DashboardData["event"];
  theme: ThemeId;
  /** Called on every share action, so a reload doesn't bring the panel back. */
  onShare: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("eventDashboard");
  const { copied, copyLink, whatsappUrl } = useInviteShare(event);

  return (
    <section
      aria-labelledby="invite-ready-title"
      className="relative animate-rise overflow-hidden rounded-[2rem] border border-brand-200 bg-[linear-gradient(140deg,var(--brand-50),var(--card)_70%)] p-5 shadow-sm sm:p-7"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute end-2 top-2 text-muted-foreground"
        aria-label={t("readyDismiss")}
        onClick={onDismiss}
      >
        <X />
      </Button>

      {/* Phone: preview beside the heading, buttons full width below. Wider: buttons beside the preview. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-5 sm:gap-x-7 sm:gap-y-4">
        <InviteMini
          theme={theme}
          title={event.title}
          className="aspect-[3/4] w-24 shrink-0 rounded-2xl shadow-md ring-1 ring-black/5 sm:row-span-2 sm:w-36"
        />
        <div className="flex min-w-0 flex-col gap-1.5 pe-9 sm:self-end">
          <h2 id="invite-ready-title" className="heading text-2xl sm:text-3xl">
            {t("readyTitle")}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("readyBody")}</p>
        </div>
        <div className="col-span-2 flex flex-col gap-2.5 sm:col-span-1 sm:col-start-2 sm:flex-row sm:flex-wrap sm:self-start">
          <WhatsAppButton href={whatsappUrl} size="lg" onClick={onShare} />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="overflow-hidden bg-card"
            onClick={() => {
              void copyLink();
              onShare();
            }}
          >
            <span className="flex items-center" aria-live="polite">
              <CopyLinkLabel copied={copied} />
            </span>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={`/${event.slug}`} target="_blank">
              <ExternalLink />
              {t("viewInvite")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
