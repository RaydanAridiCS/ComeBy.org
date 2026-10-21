import { useId } from "react";
import type { ThemeId } from "@/features/events/schema";
import { cn } from "@/lib/utils";

/*
 * Theme art. Pure SVG/CSS (no images to download), decorative only and hidden
 * from screen readers. Ambient motion uses the `invite-anim-*` classes in
 * globals.css, which only run when the user hasn't asked for reduced motion.
 *
 * - <ThemeBackdrop>: the page behind the invite card.
 * - <ThemeHeroArt>: the band at the top of the card when there's no cover photo.
 */

/** Small deterministic random generator, so the art is identical on server and client. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** SVG ids must be unique per instance (several previews can share a page). */
function useSvgId(): (name: string) => string {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (name) => `${base}-${name}`;
}

type Piece = {
  id: number;
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
  shape: number;
};

function confettiPieces(seed: number, count: number, width: number, height: number): Piece[] {
  const next = random(seed);
  const colors = ["#e0245e", "#ffb627", "#3ec5ff", "#8b5cf6", "#22c55e", "#ff7a45"];
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.round(next() * width),
    y: Math.round(next() * height),
    size: 4 + Math.round(next() * 7),
    rotate: Math.round(next() * 360),
    color: colors[Math.floor(next() * colors.length)] ?? "#e0245e",
    shape: Math.floor(next() * 4),
  }));
}

function ConfettiShape({ piece, scale = 1 }: { piece: Piece; scale?: number }) {
  const s = piece.size * scale;
  const transform = `translate(${piece.x} ${piece.y}) rotate(${piece.rotate})`;
  switch (piece.shape) {
    case 0:
      return (
        <rect
          x={-s / 2}
          y={-s / 5}
          width={s}
          height={s / 2.5}
          rx={s / 8}
          fill={piece.color}
          transform={transform}
        />
      );
    case 1:
      return <circle r={s / 3} fill={piece.color} transform={transform} />;
    case 2:
      return (
        <path
          d={`M${-s / 2} ${s / 3} L0 ${-s / 2} L${s / 2} ${s / 3} Z`}
          fill={piece.color}
          transform={transform}
        />
      );
    default:
      return (
        <path
          d={`M${-s / 2} 0 q${s / 4} ${-s / 3} ${s / 2} 0 t${s / 2} 0`}
          fill="none"
          stroke={piece.color}
          strokeWidth={s / 4}
          strokeLinecap="round"
          transform={transform}
        />
      );
  }
}

const HERO_CONFETTI = confettiPieces(7, 30, 400, 180);
const BACKDROP_CONFETTI_FAR = confettiPieces(11, 28, 1600, 1000);
const BACKDROP_CONFETTI_NEAR = confettiPieces(23, 18, 1600, 1000);

function starField(seed: number, count: number, width: number, height: number) {
  const next = random(seed);
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.round(next() * width),
    y: Math.round(next() * height),
    r: 0.5 + next() * 1.1,
  }));
}
const HERO_STARS_A = starField(5, 22, 400, 120);
const HERO_STARS_B = starField(9, 18, 400, 120);

const SKYLINE = (() => {
  const next = random(41);
  const buildings: {
    x: number;
    w: number;
    h: number;
    windows: { x: number; y: number; c: string }[];
  }[] = [];
  let x = -4;
  while (x < 404) {
    const w = 18 + Math.round(next() * 26);
    const h = 26 + Math.round(next() * 52);
    const windows: { x: number; y: number; c: string }[] = [];
    for (let wy = 180 - h + 6; wy < 174; wy += 8) {
      for (let wx = x + 4; wx < x + w - 5; wx += 7) {
        const lit = next();
        if (lit > 0.72) windows.push({ x: wx, y: wy, c: lit > 0.93 ? "#7cf7d4" : "#ffd27a" });
      }
    }
    buildings.push({ x, w, h, windows });
    x += w + 2;
  }
  return buildings;
})();

const PINES = (() => {
  const next = random(13);
  return Array.from({ length: 16 }, (_, index) => ({
    x: 8 + index * 25 + Math.round(next() * 12),
    y: 152 + Math.round(next() * 12),
    h: 9 + Math.round(next() * 9),
  }));
})();

/* ------------------------------------------------------------------ hero art */

function ConfettiHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("bg")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd0dd" />
            <stop offset="0.5" stopColor="#ffe7d4" />
            <stop offset="1" stopColor="#e4d8ff" />
          </linearGradient>
          <radialGradient id={id("glow")} cx="0.18" cy="0.1" r="0.6">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("bg")})`} />
        <rect width="400" height="180" fill={`url(#${id("glow")})`} />
        <g fill="none" strokeLinecap="round">
          <path
            d="M-10 44 C40 12 72 74 122 42 S206 10 246 52"
            stroke="#e0245e"
            strokeWidth="7"
            opacity="0.9"
          />
          <path
            d="M176 154 C218 122 250 178 300 142 S372 110 420 150"
            stroke="#ffb627"
            strokeWidth="7"
          />
          <path d="M262 18 C292 50 330 0 362 36 S402 62 424 30" stroke="#3ec5ff" strokeWidth="6" />
          <path d="M-20 132 C22 162 62 110 104 142" stroke="#8b5cf6" strokeWidth="6" />
        </g>
        <g className="invite-anim-drift">
          {HERO_CONFETTI.map((piece) => (
            <ConfettiShape key={piece.id} piece={piece} />
          ))}
        </g>
      </svg>
      <span className="invite-anim-sheen absolute inset-y-0 -start-1/2 w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgb(255_255_255/0.55)_50%,transparent_80%)] mix-blend-soft-light" />
    </>
  );
}

function WildHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMax slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfe1c8" />
            <stop offset="0.7" stopColor="#f3eedf" />
          </linearGradient>
          <radialGradient id={id("sun")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f8e2a6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f8e2a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("sky")})`} />
        <circle cx="300" cy="66" r="56" fill={`url(#${id("sun")})`} />
        <circle cx="300" cy="66" r="22" fill="#f1cf82" />
        <g fill="none" stroke="#56654f" strokeWidth="1.6" strokeLinecap="round">
          <path d="M84 48 q5 -5 10 0 q5 -5 10 0" />
          <path d="M112 36 q4 -4 8 0 q4 -4 8 0" />
        </g>
        <path
          d="M0 122 L40 96 L82 110 L132 72 L176 102 L216 84 L262 106 L306 80 L352 100 L400 86 V180 H0Z"
          fill="#bccdb1"
        />
        <path
          d="M0 140 C40 118 70 128 105 112 C140 96 170 124 210 116 C250 108 280 92 320 108 C350 120 375 112 400 104 V180 H0Z"
          fill="#94ae8a"
        />
        <path
          d="M0 160 C50 142 90 150 140 138 C190 126 230 150 280 144 C330 138 370 128 400 134 V180 H0Z"
          fill="#6b8d65"
        />
        <g fill="#3f6447">
          {PINES.map((pine) => (
            <path
              key={pine.x}
              d={`M${pine.x} ${pine.y - pine.h} l${-pine.h / 2.6} ${pine.h} h${pine.h / 1.3} Z`}
            />
          ))}
        </g>
        <path d="M0 172 C60 160 120 170 180 164 C240 158 300 172 400 160 V180 H0Z" fill="#3f6447" />
      </svg>
      <span className="surface-noise absolute inset-0 opacity-40 mix-blend-multiply" />
    </>
  );
}

function SunsetHero() {
  const id = useSvgId();
  const reflection = [70, 58, 46, 36, 26, 18];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 180"
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd29e" />
          <stop offset="0.45" stopColor="#ffae8c" />
          <stop offset="0.75" stopColor="#f98aa6" />
        </linearGradient>
        <linearGradient id={id("sea")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e07fb2" />
          <stop offset="0.5" stopColor="#a876cd" />
          <stop offset="1" stopColor="#7d6fd0" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c2" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff1c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("sun")} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff7da" />
          <stop offset="1" stopColor="#ffc56f" />
        </radialGradient>
      </defs>
      <rect width="400" height="180" fill={`url(#${id("sky")})`} />
      <g fill="#fff" opacity="0.35">
        <ellipse cx="78" cy="56" rx="54" ry="7" />
        <ellipse cx="112" cy="68" rx="36" ry="5" />
        <ellipse cx="322" cy="40" rx="44" ry="6" />
      </g>
      <circle className="invite-anim-glow" cx="200" cy="124" r="96" fill={`url(#${id("glow")})`} />
      <circle cx="200" cy="124" r="44" fill={`url(#${id("sun")})`} />
      <rect y="122" width="400" height="58" fill={`url(#${id("sea")})`} />
      <g fill="#ffe3a8">
        {reflection.map((width, index) => (
          <rect
            key={width}
            x={200 - width / 2}
            y={128 + index * 8}
            width={width}
            height="2.6"
            rx="1.3"
            opacity={0.75 - index * 0.1}
          />
        ))}
      </g>
      <g
        className="invite-anim-bob"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      >
        <path d="M0 152 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
        <path d="M-20 168 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
      </g>
      <g fill="#fff">
        <path d="M60 24 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" opacity="0.9" />
        <path d="M348 82 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" opacity="0.8" />
      </g>
    </svg>
  );
}

function MidnightHero() {
  const id = useSvgId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 180"
      preserveAspectRatio="xMidYMax slice"
      className="size-full"
    >
      <defs>
        <radialGradient id={id("sky")} cx="0.5" cy="0" r="1.1">
          <stop offset="0" stopColor="#2c3b90" />
          <stop offset="0.5" stopColor="#141c4f" />
          <stop offset="1" stopColor="#0a0f2a" />
        </radialGradient>
        <radialGradient id={id("neon")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7cf7d4" stopOpacity="0.4" />
          <stop offset="1" stopColor="#7cf7d4" stopOpacity="0" />
        </radialGradient>
        <mask id={id("moon")}>
          <rect width="400" height="180" fill="#fff" />
          <circle cx="328" cy="40" r="15" fill="#000" />
        </mask>
      </defs>
      <rect width="400" height="180" fill={`url(#${id("sky")})`} />
      <ellipse cx="200" cy="176" rx="240" ry="54" fill={`url(#${id("neon")})`} />
      <g className="invite-anim-twinkle-a" fill="#fff">
        {HERO_STARS_A.map((star) => (
          <circle key={star.id} cx={star.x} cy={star.y} r={star.r} />
        ))}
      </g>
      <g className="invite-anim-twinkle-b" fill="#dfe6ff">
        {HERO_STARS_B.map((star) => (
          <circle key={star.id} cx={star.x} cy={star.y} r={star.r} />
        ))}
      </g>
      <circle cx="318" cy="46" r="30" fill="#c4b5fd" opacity="0.14" />
      <circle cx="318" cy="46" r="17" fill="#f3f1ff" mask={`url(#${id("moon")})`} />
      <g fill="#070a18">
        {SKYLINE.map((building) => (
          <rect
            key={building.x}
            x={building.x}
            y={180 - building.h}
            width={building.w}
            height={building.h}
            rx="1.5"
          />
        ))}
      </g>
      <g>
        {SKYLINE.flatMap((building) =>
          building.windows.map((window) => (
            <rect
              key={`${window.x}-${window.y}`}
              x={window.x}
              y={window.y}
              width="2.6"
              height="3.4"
              fill={window.c}
              opacity="0.85"
            />
          )),
        )}
      </g>
    </svg>
  );
}

export type HeroDate = { day: string; month: string; weekday: string };

function CleanHero({ date }: { date?: HeroDate }) {
  return (
    <div className="@container relative size-full bg-[radial-gradient(circle_at_1px_1px,#d9dce4_1px,transparent_1.3px)] bg-[#fbfbfc] bg-size-[16px_16px]">
      <span className="absolute inset-y-0 start-1/3 w-px bg-[#e6e8ee]" />
      <span className="absolute inset-y-0 start-2/3 w-px bg-[#e6e8ee]" />
      <span className="absolute inset-x-0 top-1/2 h-px bg-[#e6e8ee]" />
      {date ? (
        <div className="absolute inset-0 flex items-end justify-between gap-3 px-[6%] pb-[5%]">
          <span className="font-[family-name:var(--font-geist-sans)] font-semibold text-[#111522] text-[34cqw] leading-[0.74] tracking-[-0.07em] tabular-nums">
            {date.day}
          </span>
          <span className="flex flex-col items-end gap-1 pb-[2%] text-end">
            <span className="size-2.5 rounded-full bg-[#224bb2]" />
            <span className="font-semibold text-[#224bb2] text-[6cqw] uppercase leading-none tracking-[0.06em]">
              {date.month}
            </span>
            <span className="font-medium text-[#5a6173] text-[3.6cqw] uppercase leading-none tracking-[0.14em]">
              {date.weekday}
            </span>
          </span>
        </div>
      ) : (
        <span className="absolute start-[6%] bottom-[12%] h-1 w-1/4 rounded-full bg-[#224bb2]" />
      )}
    </div>
  );
}

function VelvetHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("bg")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d1222" />
            <stop offset="60%" stopColor="#220712" />
            <stop offset="100%" stopColor="#120308" />
          </linearGradient>
          <radialGradient id={id("amber-glow")} cx="0.5" cy="0.45" r="0.55">
            <stop offset="0%" stopColor="#f5ad78" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#c83b5e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#120308" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("star-glow")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff8e7" stopOpacity="1" />
            <stop offset="40%" stopColor="#f5ad78" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f5ad78" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("bg")})`} />
        <rect width="400" height="180" fill={`url(#${id("amber-glow")})`} />

        {/* Art Deco golden arch filigree in background */}
        <g fill="none" stroke="#f5ad78" strokeWidth="1" opacity="0.2">
          <path d="M200 180 C200 80 140 30 50 30" />
          <path d="M200 180 C200 80 260 30 350 30" />
          <circle cx="200" cy="180" r="130" />
          <circle cx="200" cy="180" r="100" />
        </g>

        {/* Ambient champagne bokeh floating */}
        <g opacity="0.4" className="invite-anim-drift">
          <circle cx="90" cy="50" r="8" fill="#f5ad78" />
          <circle cx="310" cy="40" r="12" fill="#ffd4b2" opacity="0.3" />
          <circle cx="160" cy="30" r="5" fill="#f5ad78" />
          <circle cx="270" cy="80" r="6" fill="#ffe2c4" />
          <circle cx="130" cy="110" r="4" fill="#f5ad78" />
          <circle cx="330" cy="120" r="7" fill="#ffd4b2" opacity="0.4" />
        </g>

        {/* Two luxury coupe wine glasses clinking */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Left Coupe Glass */}
          <g transform="translate(178, 105) rotate(10)">
            <path d="M-28 -28 C-28 6 28 6 28 -28 Z" fill="#c83b5e" opacity="0.8" />
            <path
              d="M-24 -16 C-24 4 24 4 24 -16 C12 -12 -12 -12 -24 -16 Z"
              fill="#e8965a"
              opacity="0.85"
            />
            <path
              d="M-28 -28 C-28 8 28 8 28 -28"
              fill="none"
              stroke="#ffd8b8"
              strokeWidth="2"
              opacity="0.9"
            />
            <line
              x1="-28"
              y1="-28"
              x2="28"
              y2="-28"
              stroke="#ffe5cf"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <line x1="0" y1="8" x2="0" y2="44" stroke="#ffd8b8" strokeWidth="2.5" />
            <path d="M-18 44 C-10 42 10 42 18 44" stroke="#ffd8b8" strokeWidth="2.5" fill="none" />
          </g>

          {/* Right Coupe Glass */}
          <g transform="translate(222, 105) rotate(-10)">
            <path d="M-28 -28 C-28 6 28 6 28 -28 Z" fill="#c83b5e" opacity="0.8" />
            <path
              d="M-24 -16 C-24 4 24 4 24 -16 C12 -12 -12 -12 -24 -16 Z"
              fill="#e8965a"
              opacity="0.85"
            />
            <path
              d="M-28 -28 C-28 8 28 8 28 -28"
              fill="none"
              stroke="#ffd8b8"
              strokeWidth="2"
              opacity="0.9"
            />
            <line
              x1="-28"
              y1="-28"
              x2="28"
              y2="-28"
              stroke="#ffe5cf"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <line x1="0" y1="8" x2="0" y2="44" stroke="#ffd8b8" strokeWidth="2.5" />
            <path d="M-18 44 C-10 42 10 42 18 44" stroke="#ffd8b8" strokeWidth="2.5" fill="none" />
          </g>

          {/* Clinking sparkle burst in the center */}
          <circle cx="200" cy="74" r="18" fill={`url(#${id("star-glow")})`} />
          <path
            d="M200 60 L202 72 L214 74 L202 76 L200 88 L198 76 L186 74 L198 72 Z"
            fill="#ffffff"
          />
          <circle cx="206" cy="66" r="1.5" fill="#ffd4b2" />
          <circle cx="193" cy="82" r="1.5" fill="#ffd4b2" />
        </g>
      </svg>
      <span className="invite-anim-sheen absolute inset-y-0 -start-1/2 w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgb(245_173_120/0.25)_50%,transparent_80%)] mix-blend-screen" />
    </>
  );
}

function CyberHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("bg")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#120420" />
            <stop offset="60%" stopColor="#080814" />
            <stop offset="100%" stopColor="#030408" />
          </linearGradient>
          <linearGradient id={id("sun-grad")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe600" />
            <stop offset="50%" stopColor="#ff007f" />
            <stop offset="100%" stopColor="#7928ca" />
          </linearGradient>
          <linearGradient id={id("horizon-glow")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
            <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("bg")})`} />

        {/* Twinkling cyber stars */}
        <g fill="#ffffff" opacity="0.75" className="invite-anim-twinkle-a">
          <circle cx="45" cy="24" r="1.2" />
          <circle cx="110" cy="40" r="1.5" />
          <circle cx="290" cy="28" r="1.5" />
          <circle cx="355" cy="45" r="1.2" />
          <path d="M70 55 L71 58 L74 59 L71 60 L70 63 L69 60 L66 59 L69 58 Z" fill="#00f0ff" />
          <path
            d="M330 20 L331 23 L334 24 L331 25 L330 28 L329 25 L326 24 L329 23 Z"
            fill="#ff007f"
          />
        </g>

        {/* Retro synthwave sun with striped cutouts */}
        <g>
          <circle cx="200" cy="85" r="38" fill={`url(#${id("sun-grad")})`} />
          <rect x="160" y="80" width="80" height="2" fill="#090614" />
          <rect x="160" y="86" width="80" height="3" fill="#090614" />
          <rect x="160" y="93" width="80" height="4" fill="#080712" />
          <rect x="160" y="101" width="80" height="5.5" fill="#06060f" />
          <rect x="160" y="111" width="80" height="7" fill="#04050b" />
        </g>

        {/* Neon horizon beam */}
        <rect x="0" y="118" width="400" height="2" fill={`url(#${id("horizon-glow")})`} />

        {/* Perspective Grid Floor */}
        <g stroke="#00f0ff" opacity="0.45" strokeWidth="1">
          <line x1="200" y1="118" x2="-20" y2="180" />
          <line x1="200" y1="118" x2="40" y2="180" />
          <line x1="200" y1="118" x2="95" y2="180" />
          <line x1="200" y1="118" x2="145" y2="180" />
          <line x1="200" y1="118" x2="180" y2="180" />
          <line x1="200" y1="118" x2="220" y2="180" />
          <line x1="200" y1="118" x2="255" y2="180" />
          <line x1="200" y1="118" x2="305" y2="180" />
          <line x1="200" y1="118" x2="360" y2="180" />
          <line x1="200" y1="118" x2="420" y2="180" />

          <line x1="0" y1="124" x2="400" y2="124" strokeWidth="0.8" opacity="0.3" />
          <line x1="0" y1="131" x2="400" y2="131" strokeWidth="0.9" opacity="0.4" />
          <line x1="0" y1="141" x2="400" y2="141" strokeWidth="1" opacity="0.55" />
          <line x1="0" y1="155" x2="400" y2="155" strokeWidth="1.2" opacity="0.75" />
          <line x1="0" y1="174" x2="400" y2="174" strokeWidth="1.5" opacity="0.9" />
        </g>
      </svg>
      <span className="invite-anim-sheen absolute inset-y-0 -start-1/2 w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgb(0_240_255/0.25)_50%,transparent_80%)] mix-blend-screen" />
    </>
  );
}

function AuraHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("bg")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdf7fb" />
            <stop offset="50%" stopColor="#f3ecfa" />
            <stop offset="100%" stopColor="#ecf4fd" />
          </linearGradient>
          <radialGradient id={id("peach-aura")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffb3ba" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ffdfba" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffdfba" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("violet-aura")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#b388ff" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#d1c4e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d1c4e9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("mint-aura")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#b2dfdb" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#e0f2f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e0f2f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("bg")})`} />

        <circle cx="140" cy="90" r="75" fill={`url(#${id("peach-aura")})`} />
        <circle cx="250" cy="85" r="80" fill={`url(#${id("violet-aura")})`} />
        <circle cx="200" cy="115" r="60" fill={`url(#${id("mint-aura")})`} />

        <ellipse
          cx="200"
          cy="92"
          rx="95"
          ry="32"
          fill="none"
          stroke="#b388ff"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          opacity="0.65"
          transform="rotate(-12 200 92)"
        />

        <g fill="#7932c9" className="invite-anim-drift">
          <path
            d="M320 32 A 16 16 0 0 0 338 52 A 13 13 0 0 1 320 32 Z"
            fill="#8e44ad"
            opacity="0.75"
          />
          <path
            d="M200 42 L202.5 52 L212 55 L202.5 58 L200 68 L197.5 58 L188 55 L197.5 52 Z"
            fill="#7932c9"
          />
          <circle cx="200" cy="55" r="2" fill="#ffffff" />

          <path
            d="M100 48 L101.5 54 L107 56 L101.5 58 L100 64 L98.5 58 L93 56 L98.5 54 Z"
            fill="#a855f7"
            opacity="0.85"
          />
          <path
            d="M295 118 L296.5 123 L301 125 L296.5 127 L295 132 L293.5 127 L289 125 L293.5 123 Z"
            fill="#ec4899"
            opacity="0.7"
          />
          <circle cx="85" cy="115" r="2" fill="#a855f7" opacity="0.6" />
          <circle cx="330" cy="85" r="2.5" fill="#7932c9" opacity="0.5" />
        </g>
      </svg>
      <span className="invite-anim-sheen absolute inset-y-0 -start-1/2 w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgb(255_255_255/0.6)_50%,transparent_80%)] mix-blend-soft-light" />
    </>
  );
}

function OasisHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("pool-water")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#48cae4" />
            <stop offset="50%" stopColor="#00b4d8" />
            <stop offset="100%" stopColor="#0077b6" />
          </linearGradient>
          <radialGradient id={id("flower-center")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#f77f00" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("pool-water")})`} />

        <g fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.32" strokeLinecap="round">
          <path d="M-10 40 C40 20 70 60 120 35 C170 10 210 50 260 25 C310 0 350 40 410 20" />
          <path d="M10 90 C60 70 100 110 150 85 C200 60 240 100 300 75 C360 50 380 90 420 80" />
          <path d="M-20 140 C30 120 80 160 140 135 C200 110 250 150 310 125 C370 100 400 140 430 130" />
          <path d="M50 0 C45 50 80 80 75 140 C70 160 90 180 95 200" opacity="0.25" />
          <path d="M180 -10 C190 40 165 90 185 140 C195 165 175 190 180 210" opacity="0.25" />
          <path d="M300 0 C285 45 320 85 305 135 C295 160 325 185 315 210" opacity="0.25" />
        </g>

        <g transform="translate(290, 85)" className="invite-anim-bob">
          <ellipse
            cx="0"
            cy="0"
            rx="36"
            ry="18"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="46"
            ry="24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.2"
          />

          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              d="M0 0 C-10 -18 10 -28 16 -12 C18 -2 8 0 0 0 Z"
              fill="#ff6b6b"
              transform={`rotate(${angle})`}
              opacity="0.95"
            />
          ))}
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={`h-${angle}`}
              d="M0 0 C-4 -9 4 -14 7 -6 C8 -1 4 0 0 0 Z"
              fill="#ffa07a"
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" r="6" fill={`url(#${id("flower-center")})`} />
          <circle cx="0" cy="0" r="3" fill="#ffffff" opacity="0.8" />
        </g>

        <g fill="#0b525b" opacity="0.85">
          <path d="M-20 -20 Q40 30 50 110 Q20 80 -10 60 Z" />
          <path d="M-10 10 Q60 50 70 130 Q30 100 0 80 Z" fill="#13676f" opacity="0.9" />
          <path d="M0 -15 Q80 20 110 80 Q60 60 20 30 Z" fill="#187b84" opacity="0.8" />
        </g>

        <g fill="#ffffff">
          <path
            d="M120 45 L121.5 50 L126 51.5 L121.5 53 L120 58 L118.5 53 L114 51.5 L118.5 50 Z"
            opacity="0.8"
          />
          <path
            d="M210 110 L211 113.5 L214.5 114.5 L211 115.5 L210 119 L209 115.5 L205.5 114.5 L209 113.5 Z"
            opacity="0.75"
          />
          <circle cx="165" cy="75" r="1.5" opacity="0.6" />
        </g>
      </svg>
      <span className="invite-anim-sheen absolute inset-y-0 -start-1/2 w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgb(255_255_255/0.5)_50%,transparent_80%)] mix-blend-soft-light" />
    </>
  );
}

function MatchaHero() {
  const id = useSvgId();
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <defs>
          <linearGradient id={id("table")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ede9dc" />
            <stop offset="100%" stopColor="#e2ddd0" />
          </linearGradient>
          <radialGradient id={id("matcha-cup")} cx="0.45" cy="0.45" r="0.5">
            <stop offset="0%" stopColor="#5a8542" />
            <stop offset="65%" stopColor="#43682f" />
            <stop offset="100%" stopColor="#2c471e" />
          </radialGradient>
        </defs>
        <rect width="400" height="180" fill={`url(#${id("table")})`} />

        <polygon points="0,0 180,0 280,180 0,180" fill="#ffffff" opacity="0.25" />

        <g transform="translate(200, 95)">
          <ellipse cx="2" cy="12" rx="66" ry="46" fill="#1a2014" opacity="0.14" />
          <ellipse
            cx="0"
            cy="8"
            rx="68"
            ry="46"
            fill="#f8f6f0"
            stroke="#d5d0bf"
            strokeWidth="1.5"
          />
          <ellipse cx="0" cy="8" rx="56" ry="38" fill="#ebe6d6" opacity="0.6" />

          <ellipse cx="0" cy="0" rx="48" ry="36" fill="#fcfbf7" stroke="#c9c4b1" strokeWidth="2" />
          <ellipse cx="0" cy="0" rx="43" ry="31" fill={`url(#${id("matcha-cup")})`} />

          <g fill="#fbfaf6" opacity="0.95">
            <path d="M0 -18 C-4 -24 -9 -19 -4 -13 L0 -8 L4 -13 C9 -19 4 -24 0 -18 Z" />
            <ellipse cx="-7" cy="-7" rx="5" ry="3" transform="rotate(-25 -7 -7)" />
            <ellipse cx="7" cy="-7" rx="5" ry="3" transform="rotate(25 7 -7)" />
            <ellipse cx="-9" cy="0" rx="6" ry="3.5" transform="rotate(-20 -9 0)" />
            <ellipse cx="9" cy="0" rx="6" ry="3.5" transform="rotate(20 9 0)" />
            <ellipse cx="-9" cy="8" rx="7" ry="4" transform="rotate(-15 -9 8)" />
            <ellipse cx="9" cy="8" rx="7" ry="4" transform="rotate(15 9 8)" />
            <line
              x1="0"
              y1="-10"
              x2="0"
              y2="18"
              stroke="#fbfaf6"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="0" cy="18" r="3" fill="#fbfaf6" />
          </g>
        </g>

        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
          className="invite-anim-drift"
        >
          <path d="M185 45 Q175 30 188 15 Q195 5 186 -5" />
          <path d="M212 40 Q225 25 214 12 Q206 0 216 -10" />
        </g>

        <g transform="translate(100, 120) rotate(-28)">
          <path d="M0 0 C-8 -14 0 -26 18 -32 C22 -14 14 0 0 0 Z" fill="#588143" />
          <line x1="0" y1="0" x2="16" y2="-28" stroke="#3b5e29" strokeWidth="1" />
        </g>
        <g transform="translate(112, 134) rotate(35)">
          <path d="M0 0 C-6 -10 0 -20 14 -24 C17 -10 10 0 0 0 Z" fill="#6c9b53" opacity="0.9" />
          <line x1="0" y1="0" x2="12" y2="-21" stroke="#486f34" strokeWidth="0.8" />
        </g>
      </svg>
      <span className="surface-noise absolute inset-0 opacity-25 mix-blend-multiply" />
    </>
  );
}

/** The art band at the top of an invite card (shown when there's no cover photo). */
export function ThemeHeroArt({
  theme,
  date,
  className,
}: {
  theme: ThemeId;
  date?: HeroDate;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden="true">
      {theme === "confetti" ? <ConfettiHero /> : null}
      {theme === "wild" ? <WildHero /> : null}
      {theme === "sunset" ? <SunsetHero /> : null}
      {theme === "midnight" ? <MidnightHero /> : null}
      {theme === "clean" ? <CleanHero date={date} /> : null}
      {theme === "velvet" ? <VelvetHero /> : null}
      {theme === "cyber" ? <CyberHero /> : null}
      {theme === "aura" ? <AuraHero /> : null}
      {theme === "oasis" ? <OasisHero /> : null}
      {theme === "matcha" ? <MatchaHero /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ backdrops */

function ConfettiBackdrop() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMin slice"
        className="invite-anim-drift absolute inset-0 size-full opacity-45 blur-[1px]"
      >
        {BACKDROP_CONFETTI_FAR.map((piece) => (
          <ConfettiShape key={piece.id} piece={piece} scale={0.9} />
        ))}
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-0 size-full"
      >
        {BACKDROP_CONFETTI_NEAR.map((piece) => (
          <ConfettiShape key={piece.id} piece={piece} scale={1.6} />
        ))}
      </svg>
    </>
  );
}

function LeafSprig({ className }: { className?: string }) {
  const leaves = [
    { x: 40, y: 150, r: -40 },
    { x: 58, y: 122, r: 30 },
    { x: 64, y: 96, r: -35 },
    { x: 84, y: 72, r: 28 },
    { x: 92, y: 48, r: -30 },
    { x: 114, y: 30, r: 24 },
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 160 200" className={className}>
      <path
        d="M20 198 C40 150 70 100 130 14"
        fill="none"
        stroke="#7a9a6b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {leaves.map((leaf, index) => (
        <ellipse
          key={leaf.y}
          cx={leaf.x}
          cy={leaf.y}
          rx="9"
          ry="20"
          fill={index % 2 === 0 ? "#9db58a" : "#86a477"}
          transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
        />
      ))}
    </svg>
  );
}

function WildBackdrop() {
  return (
    <>
      <LeafSprig className="absolute -end-6 -top-4 w-40 rotate-[18deg] opacity-80 sm:w-56" />
      <LeafSprig className="absolute -start-8 bottom-10 w-36 -scale-x-100 rotate-[-12deg] opacity-70 sm:w-52" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[18vh] w-full"
      >
        <path
          d="M0 160 L0 90 L180 30 L330 100 L470 46 L640 120 L800 52 L980 110 L1200 38 L1200 160 Z"
          fill="#c9d8b6"
          opacity="0.7"
        />
        <path
          d="M0 160 L0 128 L220 80 L400 136 L560 92 L760 146 L940 98 L1200 140 L1200 160 Z"
          fill="#9db58a"
          opacity="0.7"
        />
      </svg>
      <span className="surface-noise absolute inset-0 opacity-30 mix-blend-multiply" />
    </>
  );
}

function SunsetBackdrop() {
  return (
    <>
      <span className="invite-anim-glow absolute inset-0 bg-[radial-gradient(60%_40%_at_70%_20%,rgb(255_190_150/0.65),transparent_70%)]" />
      <span className="absolute -top-40 start-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_244_200/0.85)_0%,rgb(255_205_140/0.35)_40%,transparent_68%)] rtl:translate-x-1/2" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[16vh] w-full"
      >
        <g className="invite-anim-bob" fill="#fff">
          <path
            d="M0 70 Q150 40 300 70 T600 70 T900 70 T1200 70 L1200 140 L0 140 Z"
            opacity="0.18"
          />
          <path
            d="M0 96 Q150 72 300 96 T600 96 T900 96 T1200 96 L1200 140 L0 140 Z"
            opacity="0.22"
          />
        </g>
      </svg>
    </>
  );
}

/*
 * Star fields as tiled CSS dots (a few hundred bytes instead of hundreds of SVG
 * nodes). Odd tile sizes keep the pattern from looking like a grid.
 */
const STARS_A = [
  "radial-gradient(1.4px 1.4px at 23px 41px, #fff 60%, transparent 100%)",
  "radial-gradient(1px 1px at 97px 13px, #fff 60%, transparent 100%)",
  "radial-gradient(1.2px 1.2px at 61px 109px, #fff 60%, transparent 100%)",
  "radial-gradient(1px 1px at 131px 77px, #dfe6ff 60%, transparent 100%)",
].join(", ");
const STARS_B = [
  "radial-gradient(1.6px 1.6px at 41px 157px, #fff 60%, transparent 100%)",
  "radial-gradient(1px 1px at 173px 29px, #cfd8ff 60%, transparent 100%)",
  "radial-gradient(1.2px 1.2px at 113px 191px, #fff 60%, transparent 100%)",
].join(", ");

function MidnightBackdrop() {
  return (
    <>
      <span className="absolute -start-24 top-1/3 size-80 rounded-full bg-[radial-gradient(circle,rgb(124_247_212/0.16),transparent_70%)]" />
      <span className="absolute -end-24 bottom-16 size-96 rounded-full bg-[radial-gradient(circle,rgb(167_139_250/0.2),transparent_70%)]" />
      <span
        className="invite-anim-twinkle-a absolute inset-0"
        style={{ backgroundImage: STARS_A, backgroundSize: "149px 167px" }}
      />
      <span
        className="invite-anim-twinkle-b absolute inset-0"
        style={{ backgroundImage: STARS_B, backgroundSize: "211px 233px" }}
      />
    </>
  );
}

function VelvetBackdrop() {
  return (
    <>
      <span className="invite-anim-glow absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_15%,rgb(232_150_90/0.14),transparent_70%)]" />
      <span className="absolute -top-28 start-1/4 size-[28rem] rounded-full bg-[radial-gradient(circle,rgb(140_30_60/0.28)_0%,transparent_65%)]" />
      <span className="absolute -bottom-24 end-1/4 size-[32rem] rounded-full bg-[radial-gradient(circle,rgb(245_173_120/0.08)_0%,transparent_65%)]" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        className="invite-anim-drift absolute inset-0 size-full opacity-30 pointer-events-none"
      >
        <circle cx="200" cy="180" r="4" fill="#f5ad78" />
        <circle cx="450" cy="320" r="6" fill="#ffd4b2" opacity="0.6" />
        <circle cx="1250" cy="220" r="5" fill="#f5ad78" />
        <circle cx="1400" cy="480" r="7" fill="#ffd4b2" opacity="0.5" />
        <circle cx="300" cy="780" r="5" fill="#f5ad78" />
        <circle cx="1300" cy="850" r="6" fill="#ffd4b2" opacity="0.7" />
      </svg>
    </>
  );
}

function CyberBackdrop() {
  return (
    <>
      <span className="invite-anim-glow absolute -start-28 -top-28 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(255_0_128/0.2)_0%,transparent_70%)]" />
      <span className="invite-anim-glow absolute -end-28 top-1/4 size-[32rem] rounded-full bg-[radial-gradient(circle,rgb(0_240_255/0.18)_0%,transparent_70%)]" />
      <span className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(0,240,255,0.06)_100%)]" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[22vh] w-full opacity-35 pointer-events-none"
      >
        <g stroke="#00f0ff" strokeWidth="1">
          <line x1="600" y1="0" x2="-200" y2="200" />
          <line x1="600" y1="0" x2="0" y2="200" />
          <line x1="600" y1="0" x2="200" y2="200" />
          <line x1="600" y1="0" x2="400" y2="200" />
          <line x1="600" y1="0" x2="600" y2="200" />
          <line x1="600" y1="0" x2="800" y2="200" />
          <line x1="600" y1="0" x2="1000" y2="200" />
          <line x1="600" y1="0" x2="1200" y2="200" />
          <line x1="600" y1="0" x2="1400" y2="200" />
          <line x1="0" y1="30" x2="1200" y2="30" opacity="0.3" />
          <line x1="0" y1="70" x2="1200" y2="70" opacity="0.5" />
          <line x1="0" y1="125" x2="1200" y2="125" opacity="0.7" />
          <line x1="0" y1="190" x2="1200" y2="190" opacity="0.9" />
        </g>
      </svg>
    </>
  );
}

function AuraBackdrop() {
  return (
    <>
      <span className="invite-anim-glow absolute -top-32 start-1/4 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(255_182_193/0.38)_0%,transparent_65%)]" />
      <span className="invite-anim-glow absolute -bottom-32 end-1/4 size-[38rem] rounded-full bg-[radial-gradient(circle,rgb(179_136_255/0.32)_0%,transparent_65%)]" />
      <span className="absolute top-1/3 -start-24 size-[26rem] rounded-full bg-[radial-gradient(circle,rgb(178_223_219/0.35)_0%,transparent_65%)]" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        className="invite-anim-drift absolute inset-0 size-full opacity-40 pointer-events-none"
      >
        <path
          d="M250 200 L252 208 L260 210 L252 212 L250 220 L248 212 L240 210 L248 208 Z"
          fill="#7932c9"
        />
        <path
          d="M1350 280 L1352 288 L1360 290 L1352 292 L1350 300 L1348 292 L1340 290 L1348 288 Z"
          fill="#a855f7"
        />
        <path
          d="M1100 750 L1102 757 L1109 759 L1102 761 L1100 768 L1098 761 L1091 759 L1098 757 Z"
          fill="#7932c9"
        />
        <path
          d="M350 820 L352 827 L359 829 L352 831 L350 838 L348 831 L341 829 L348 827 Z"
          fill="#ec4899"
        />
      </svg>
    </>
  );
}

function OasisBackdrop() {
  return (
    <>
      <span className="invite-anim-glow absolute -top-24 end-0 size-[32rem] rounded-full bg-[radial-gradient(circle,rgb(184_240_234/0.55)_0%,transparent_70%)]" />
      <span className="absolute -bottom-24 -start-16 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(255_227_203/0.6)_0%,transparent_70%)]" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[20vh] w-full opacity-20 pointer-events-none"
      >
        <path d="M0 400 Q150 320 300 350 T600 340 T900 360 T1200 330 L1200 400 Z" fill="#0c7f7f" />
      </svg>
    </>
  );
}

function MatchaBackdrop() {
  return (
    <>
      <span className="absolute -top-32 start-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(227_236_220/0.7)_0%,transparent_65%)]" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-35 pointer-events-none"
      >
        <g fill="none" stroke="#d5d0bd" strokeWidth="1.5">
          <circle cx="250" cy="200" r="100" />
          <circle cx="250" cy="200" r="140" />
          <circle cx="250" cy="200" r="180" />
          <circle cx="950" cy="650" r="120" />
          <circle cx="950" cy="650" r="170" />
        </g>
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        className="invite-anim-drift absolute inset-0 size-full opacity-45 pointer-events-none"
      >
        <path d="M300 240 C290 225 300 210 320 205 C325 225 315 240 300 240 Z" fill="#7a9e62" />
        <path
          d="M1280 320 C1270 305 1280 290 1300 285 C1305 305 1295 320 1280 320 Z"
          fill="#8dae75"
        />
        <path
          d="M1400 700 C1390 685 1400 670 1420 665 C1425 685 1415 700 1400 700 Z"
          fill="#7a9e62"
        />
        <path d="M220 800 C210 785 220 770 240 765 C245 785 235 800 220 800 Z" fill="#8dae75" />
      </svg>
      <span className="surface-noise absolute inset-0 opacity-25 mix-blend-multiply" />
    </>
  );
}

/**
 * The art behind the invite card. On the invite page it's `fixed`, so the
 * scenery stays put while the card scrolls; in previews it fills its container.
 */
export function ThemeBackdrop({
  theme,
  fixed = false,
  className,
}: {
  theme: ThemeId;
  fixed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        fixed ? "fixed" : "absolute",
        className,
      )}
      style={{ background: "var(--invite-bg)" }}
      aria-hidden="true"
    >
      {theme === "confetti" ? <ConfettiBackdrop /> : null}
      {theme === "wild" ? <WildBackdrop /> : null}
      {theme === "sunset" ? <SunsetBackdrop /> : null}
      {theme === "midnight" ? <MidnightBackdrop /> : null}
      {theme === "clean" ? (
        <span className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgb(34_75_178/0.08),transparent_70%)]" />
      ) : null}
      {theme === "velvet" ? <VelvetBackdrop /> : null}
      {theme === "cyber" ? <CyberBackdrop /> : null}
      {theme === "aura" ? <AuraBackdrop /> : null}
      {theme === "oasis" ? <OasisBackdrop /> : null}
      {theme === "matcha" ? <MatchaBackdrop /> : null}
    </div>
  );
}
