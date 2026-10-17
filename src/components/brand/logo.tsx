import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Comeby mark: a speech bubble with a check, i.e. "I'm coming". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect x="2" y="3" width="28" height="22" rx="9" fill="currentColor" />
      <path d="M10 25 L8 30 L15 25 Z" fill="currentColor" />
      <path
        d="M10.5 14.5 L14.5 18.5 L22 10.5"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-bold text-lg tracking-tight", className)}
    >
      <LogoMark className="text-brand" />
      <span>Comeby</span>
    </Link>
  );
}
