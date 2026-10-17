import type { ReactNode } from "react";

/** Centered heading + content used by every sign-in related page. */
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-bold text-2xl tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
