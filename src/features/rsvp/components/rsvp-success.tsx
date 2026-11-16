"use client";

import { Check, HelpCircle, Pencil } from "lucide-react";
import { domAnimation, LazyMotion, MotionConfig, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef } from "react";
import { EASE_OUT, SPRING_PRESS } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { RsvpStatusValue } from "../schema";
import { Celebration } from "./celebration";
import { inviteSecondaryButton } from "./invite-buttons";

/**
 * The "You're in!" moment after a guest responds. Loaded on demand (it's the only
 * part of the invite that needs the animation library).
 */
export function RsvpSuccess({
  status,
  emailed,
  hostName,
  confettiColors,
  afterSuccess,
  onChange,
}: {
  status: RsvpStatusValue;
  emailed: boolean;
  hostName: string;
  confettiColors: string[];
  afterSuccess?: ReactNode;
  onChange: () => void;
}) {
  const t = useTranslations("rsvp");
  const title =
    status === "going"
      ? t("doneGoingTitle")
      : status === "maybe"
        ? t("doneMaybeTitle")
        : t("doneNotGoingTitle", { host: hostName });
  // A plain check for "can't go" too: they did the host a favour by saying so.
  const Icon = status === "maybe" ? HelpCircle : Check;
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form was taller than this, so the page may have jumped: bring the result into view
  // and move focus to it, which also has a screen reader read it out.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          ref={rootRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="relative flex flex-col items-center gap-4 py-4 text-center"
        >
          {status === "going" ? <Celebration colors={confettiColors} /> : null}
          <m.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...SPRING_PRESS, delay: 0.05 }}
            className={cn(
              "relative flex size-18 items-center justify-center rounded-full",
              status === "going"
                ? "bg-invite-accent text-invite-accent-fg shadow-lg"
                : "invite-chip text-(--invite-accent-ink)",
            )}
            aria-hidden="true"
          >
            {status === "going" ? (
              <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true">
                <m.path
                  d="M5 12.5 L10 17.5 L19 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.2, ease: EASE_OUT }}
                />
              </svg>
            ) : (
              <Icon className="size-8" />
            )}
          </m.span>
          <div className="flex flex-col gap-1.5">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="invite-heading text-[1.75rem] leading-tight outline-none"
            >
              {title}
            </h2>
            <p className="text-invite-muted">{t("doneBody", { host: hostName })}</p>
            <p className="text-invite-muted text-sm">
              {emailed ? t("editLinkSent") : t("changeHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className={inviteSecondaryButton} onClick={onChange}>
              <Pencil className="size-4" aria-hidden="true" />
              {t("changeResponse")}
            </button>
            {afterSuccess}
          </div>
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
