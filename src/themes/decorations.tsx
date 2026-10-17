import type { ThemeId } from "@/features/events/schema";

/*
 * Background decorations for each theme. Pure SVG/CSS (no images to download),
 * purely visual and hidden from screen readers.
 */

const CONFETTI_PIECES = [
  { x: 6, y: 8, r: 18, c: "#ff4f79", w: 10, h: 4 },
  { x: 18, y: 22, r: -30, c: "#ffc23e", w: 8, h: 8 },
  { x: 88, y: 6, r: 40, c: "#4fc3ff", w: 12, h: 4 },
  { x: 94, y: 30, r: -12, c: "#8b5cf6", w: 6, h: 6 },
  { x: 76, y: 14, r: 60, c: "#22c55e", w: 10, h: 3 },
  { x: 32, y: 4, r: 10, c: "#4fc3ff", w: 6, h: 6 },
  { x: 60, y: 6, r: -50, c: "#ff4f79", w: 9, h: 3 },
  { x: 4, y: 52, r: 25, c: "#ffc23e", w: 10, h: 4 },
  { x: 96, y: 62, r: -35, c: "#ff4f79", w: 8, h: 8 },
  { x: 8, y: 84, r: 70, c: "#8b5cf6", w: 12, h: 4 },
  { x: 90, y: 90, r: 15, c: "#22c55e", w: 7, h: 7 },
  { x: 50, y: 96, r: -20, c: "#4fc3ff", w: 10, h: 3 },
];

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI_PIECES.map((piece) => (
        <span
          key={`${piece.x}-${piece.y}`}
          className="absolute rounded-[2px] opacity-80"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: piece.w,
            height: piece.h,
            background: piece.c,
            transform: `rotate(${piece.r}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Wild() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-48 w-full opacity-60"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 200 L0 120 L180 40 L330 130 L470 60 L640 150 L800 70 L980 140 L1200 50 L1200 200 Z"
          fill="#c9d8b6"
        />
        <path
          d="M0 200 L0 160 L220 100 L400 170 L560 110 L760 180 L940 120 L1200 170 L1200 200 Z"
          fill="#9db58a"
        />
      </svg>
      <svg
        aria-hidden="true"
        className="absolute -top-6 -right-6 h-40 w-40 opacity-50"
        viewBox="0 0 100 100"
      >
        <path d="M50 5 C80 20 90 55 50 95 C10 55 20 20 50 5 Z" fill="#9db58a" />
        <path d="M50 12 L50 90" stroke="#5e7a4f" strokeWidth="2" />
      </svg>
    </div>
  );
}

function Sunset() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute top-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,240,180,0.9) 0%, rgba(255,200,120,0.4) 45%, transparent 70%)",
        }}
      />
      <svg
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-24 w-full opacity-40"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path d="M0 60 Q150 30 300 60 T600 60 T900 60 T1200 60 L1200 100 L0 100 Z" fill="#ffffff" />
      </svg>
    </div>
  );
}

const STARS = Array.from({ length: 28 }, (_, index) => ({
  x: (index * 37) % 100,
  y: (index * 53) % 100,
  size: (index % 3) + 1,
  opacity: 0.3 + ((index * 7) % 6) / 10,
}));

function Midnight() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={`${star.x}-${star.y}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
      <div
        className="absolute top-1/3 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(124, 247, 212, 0.12)" }}
      />
      <div
        className="absolute -right-24 bottom-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(167, 139, 250, 0.16)" }}
      />
    </div>
  );
}

export function ThemeDecorations({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case "confetti":
      return <Confetti />;
    case "wild":
      return <Wild />;
    case "sunset":
      return <Sunset />;
    case "midnight":
      return <Midnight />;
    case "clean":
      return null;
  }
}
