import Link from "next/link";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The Comeby mark: a rounded "C" whose tail becomes a check, i.e. "I'm coming".
 * Drawn in currentColor, so `text-brand` gives the blue mark and `text-foreground` the mono one.
 * Keep the path in sync with scripts/generate-icons.ts.
 */
export const LOGO_PATH = "M37.83 13.62 A18.5 18.5 0 0 0 20.1 45.58 L28 51.74 L50.96 18.98";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-7", className)} aria-hidden="true">
      <path
        d={LOGO_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mark on a brand-gradient tile, like the app icon. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-[28%] bg-brand-gradient text-white shadow-brand",
        className,
      )}
      aria-hidden="true"
    >
      <LogoMark className="size-[68%]" />
    </span>
  );
}

/** Mark + wordmark lock-up, linking home (or to the dashboard). */
export function Logo({
  href = "/",
  tone = "default",
  className,
}: {
  href?: string;
  /** "inverse" draws the whole lock-up in white, for brand-coloured backgrounds. */
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-m-1 inline-flex items-center gap-2 rounded-lg p-1 font-heading font-bold text-[1.375rem] lowercase leading-none tracking-[-0.045em] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        tone === "inverse" && "text-white",
        className,
      )}
    >
      <LogoMark className={cn("size-7", tone === "inverse" ? "text-white" : "text-brand")} />
      <span className="-mt-0.5">{SITE.name}</span>
    </Link>
  );
}
