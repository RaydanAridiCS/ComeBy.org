import type { ReactNode } from "react";

/**
 * Heading + content used by every sign-in related page. When the form swaps itself for an
 * after-submit screen (`AuthStatus`, marked `data-auth-status`), that screen brings its own
 * heading and this one is hidden, subtitle included.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="group/auth flex flex-col gap-8">
      <div className="flex flex-col gap-2 group-has-[[data-auth-status]]/auth:hidden">
        <h1 className="heading text-[2rem] leading-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
