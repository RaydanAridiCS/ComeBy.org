import type { ReactNode } from "react";
import { LostEnvelope } from "@/components/brand/lost-envelope";

/**
 * The body of a "not found" or "something broke" screen: the envelope, a heading, one
 * line of explanation and the actions. Works in server and client components. It brings
 * no page chrome and no font: wrap it in `StatusPage` outside the dashboard.
 */
export function StatusMessage({
  mark = "?",
  title,
  body,
  children,
}: {
  /** The symbol on the envelope's seal: "?" for missing, "!" for broken. */
  mark?: string;
  title: string;
  body: string;
  /** The actions: buttons and links. */
  children: ReactNode;
}) {
  return (
    <>
      <LostEnvelope mark={mark} className="animate-pop" />
      <div className="flex max-w-md animate-rise flex-col gap-2 [--i:1]">
        <h1 className="heading text-headline">{title}</h1>
        <p className="text-pretty text-muted-foreground">{body}</p>
      </div>
      <div className="flex animate-rise flex-wrap justify-center gap-3 [--i:2]">{children}</div>
    </>
  );
}
