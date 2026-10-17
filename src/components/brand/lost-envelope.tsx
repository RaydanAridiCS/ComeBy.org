import { cn } from "@/lib/utils";

/** A small illustration for "not found" and error states: an envelope that lost its way. */
export function LostEnvelope({
  mark = "?",
  className,
}: {
  /** The symbol on the envelope's seal. */
  mark?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 220 160" className={cn("w-56", className)} aria-hidden="true">
      <path
        d="M18 128 C 40 96, 70 140, 96 108 S 140 70, 150 58"
        fill="none"
        stroke="var(--brand-300)"
        strokeWidth="2.5"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <g className="animate-float">
        <g transform="rotate(-8 150 60)">
          <rect
            x="110"
            y="30"
            width="86"
            height="60"
            rx="10"
            fill="var(--card)"
            stroke="var(--brand-200)"
            strokeWidth="2.5"
          />
          <path
            d="M112 34 L153 66 L194 34"
            fill="none"
            stroke="var(--brand-300)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="153" cy="66" r="13" fill="var(--brand-600)" />
          <text
            x="153"
            y="71.5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill="#fff"
            fontFamily="var(--font-geist-sans), sans-serif"
          >
            {mark}
          </text>
        </g>
      </g>
      <circle cx="40" cy="40" r="3" fill="var(--brand-200)" />
      <circle cx="196" cy="118" r="4" fill="var(--brand-100)" />
      <path d="M70 28 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="var(--brand-300)" />
    </svg>
  );
}
