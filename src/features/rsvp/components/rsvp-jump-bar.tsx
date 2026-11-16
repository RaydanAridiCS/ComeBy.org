"use client";

import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** How much of the screen's bottom edge the bar covers, so the picker counts as seen above it. */
const BAR_CLEARANCE = 96;

/**
 * A slim bar on the bottom edge while the answer buttons are still further down the page:
 * the date and one button that takes the guest to the form. It goes away once the buttons
 * are on screen, and never shows above them (a guest who scrolled past has seen the form).
 */
export function RsvpJumpBar({
  target,
  dateLabel,
  onJump,
}: {
  /** The answer buttons. */
  target: RefObject<HTMLElement | null>;
  dateLabel: string;
  onJump: () => void;
}) {
  const t = useTranslations("rsvp");
  const [visible, setVisible] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    // Rendered on the themed page wrapper: the invite card can have a blur or a transform,
    // which would pin a `position: fixed` child to the card instead of the screen.
    setHost(element.closest<HTMLElement>(".invite-page") ?? document.body);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top > 0);
      },
      { rootMargin: `0px 0px -${BAR_CLEARANCE}px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  if (!host) return null;
  return createPortal(
    <div
      data-rsvp-bar=""
      data-visible={visible}
      inert={!visible}
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      {/* The card's colour over the solid page colour: opaque, and the colours the theme's
          contrast check covers (muted text and the accent button are tuned for the card).
          A strip along the bottom of a phone; a floating pill as wide as the card from sm. */}
      <div className="border-(--invite-card-border) border-t px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] text-(--invite-fg) shadow-[0_-10px_30px_-16px_rgb(0_0_0/0.35)] [background:linear-gradient(var(--invite-card),var(--invite-card)),var(--invite-bg-solid)] sm:mx-auto sm:mb-[calc(1.5rem+var(--safe-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[33rem] sm:rounded-full sm:border sm:py-2 sm:ps-6 sm:pe-2 sm:shadow-xl">
        <div className="mx-auto flex w-full max-w-[34rem] items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate font-semibold">{t("title")}</p>
            <p className="truncate text-invite-muted text-sm">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onJump}
            className="invite-focus inline-flex h-11 shrink-0 items-center rounded-full bg-invite-accent px-6 font-semibold text-invite-accent-fg shadow-md transition hover:brightness-105 active:scale-[0.97]"
          >
            {t("jump")}
          </button>
        </div>
      </div>
    </div>,
    host,
  );
}
