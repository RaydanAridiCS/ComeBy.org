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
    </div>
  );
}
