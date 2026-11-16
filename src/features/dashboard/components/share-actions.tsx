"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/share";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../dto";

/**
 * The pieces every "share this invite" surface is built from: the share card on the
 * event page and the "your invite is ready" panel shown right after creating.
 */

/** Copy-link state and the ready-made WhatsApp message for an event. */
export function useInviteShare(event: Pick<DashboardData["event"], "title" | "when" | "url">) {
  const t = useTranslations("eventDashboard");
  const tCommon = useTranslations("common");
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
  return { copied, copyLink, whatsappUrl: whatsappShareUrl(inviteMessage) };
}

/** "Copy link" that flips to "Copied" for a moment. Put it inside the button that copies. */
export function CopyLinkLabel({ copied }: { copied: boolean }) {
  const t = useTranslations("eventDashboard");
  return (
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
  );
}

/** The green "Share on WhatsApp" button. Opens WhatsApp with the message ready to send. */
export function WhatsAppButton({
  href,
  className,
  ...props
}: { href: string } & Omit<ComponentProps<typeof Button>, "asChild" | "children">) {
  const t = useTranslations("eventDashboard");
  return (
    <Button
      asChild
      className={cn(
        "bg-[#1fae55] text-white shadow-[0_6px_16px_-6px_#1fae55] hover:bg-[#178f45]",
        className,
      )}
      {...props}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle />
        {t("shareWhatsApp")}
      </a>
    </Button>
  );
}
