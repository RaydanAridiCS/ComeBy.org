"use client";

import { Check, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * What an auth screen shows once its form has done its job: "Check your email", "Password
 * changed", "This link doesn't work". It brings its own heading, and `AuthCard` hides the
 * card's heading and subtitle while one is on screen, so the page never shows two headings
 * or a subtitle about a form that is gone.
 *
 * The heading takes focus when the screen appears after a submit, so a screen reader reads
 * the news and keyboard users carry on from there. Pass `autoFocus={false}` when the page
 * opens straight onto this screen.
 */
export function AuthStatus({
  art,
  title,
  body,
  children,
  autoFocus = true,
}: {
  art: ReactNode;
  title: string;
  body: ReactNode;
  /** The next steps: buttons and links, most important first. */
  children: ReactNode;
  autoFocus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [autoFocus]);

  return (
    <div data-auth-status className="flex animate-pop flex-col items-center gap-5 text-center">
      {art}
      <div className="flex flex-col gap-2">
        <h1 ref={heading} tabIndex={-1} className="heading text-headline outline-none">
          {title}
        </h1>
        <p className="text-pretty text-muted-foreground">{body}</p>
      </div>
      <div className="flex w-full flex-col items-center gap-3">{children}</div>
    </div>
  );
}

/** The brand tile with an icon and a green tick, for "sent" and "done" screens. */
export function StatusTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative flex size-20 items-center justify-center rounded-[1.75rem] bg-brand-gradient text-white shadow-brand">
      <Icon className="size-9" aria-hidden="true" />
      <span className="absolute -end-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-success text-white ring-4 ring-background">
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    </span>
  );
}

/** "Can't find it? Check your spam folder", in a soft box. */
export function MailHint({ children }: { children: ReactNode }) {
  return (
    <p className="w-full rounded-2xl bg-muted px-4 py-3 text-muted-foreground text-sm">
      {children}
    </p>
  );
}
