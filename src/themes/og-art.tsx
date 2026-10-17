import type { ThemeId } from "@/features/events/schema";

/*
 * Theme art for the 1200×630 link-preview image (rendered by next/og / Satori).
 * Satori only understands inline styles and plain SVG, so this is separate from
 * decorations.tsx, but it mirrors the same scenes. The invite card covers the
 * left ~65% of the canvas, so each scene puts its hero element on the right.
 */

const W = 1200;
const H = 630;

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const layer = { position: "absolute", top: 0, left: 0 } as const;

function ConfettiArt() {
  const next = random(29);
  const colors = ["#e0245e", "#ffb627", "#3ec5ff", "#8b5cf6", "#22c55e", "#ff7a45"];
  const pieces = Array.from({ length: 70 }, (_, id) => {
    const rightSide = id < 50;
    return {
      id,
      x: rightSide ? 800 + next() * 400 : next() * W,
      y: next() * H,
      size: 10 + next() * 16,
      rotate: next() * 360,
      color: colors[Math.floor(next() * colors.length)] ?? "#e0245e",
      round: next() > 0.7,
    };
  });
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <g fill="none" strokeLinecap="round">
        <path
          d="M760 90 C860 10 920 170 1020 90 S1160 20 1230 110"
          stroke="#e0245e"
          strokeWidth="16"
        />
        <path
          d="M800 560 C880 470 960 600 1060 520 S1180 460 1240 540"
          stroke="#ffb627"
          strokeWidth="16"
        />
        <path
          d="M900 300 C960 240 1040 360 1110 290 S1200 250 1240 300"
          stroke="#3ec5ff"
          strokeWidth="13"
        />
        <path d="M-20 600 C60 560 120 640 200 600" stroke="#8b5cf6" strokeWidth="13" />
      </g>
      {pieces.map((piece) =>
        piece.round ? (
          <circle key={piece.id} cx={piece.x} cy={piece.y} r={piece.size / 3} fill={piece.color} />
        ) : (
          <rect
            key={piece.id}
            x={piece.x - piece.size / 2}
            y={piece.y - piece.size / 5}
            width={piece.size}
            height={piece.size / 2.4}
            rx={piece.size / 8}
            fill={piece.color}
            transform={`rotate(${piece.rotate} ${piece.x} ${piece.y})`}
          />
        ),
      )}
    </svg>
  );
}

function WildArt() {
  const next = random(13);
  const pines = Array.from({ length: 22 }, (_, id) => ({
    id,
    x: 20 + id * 56 + next() * 20,
    y: 560 + next() * 26,
    h: 26 + next() * 26,
  }));
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f8e2a6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f8e2a6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="1030" cy="160" r="150" fill="url(#sun)" />
      <circle cx="1030" cy="160" r="62" fill="#f1cf82" />
      <g fill="none" stroke="#56654f" strokeWidth="4" strokeLinecap="round">
        <path d="M880 120 q14 -14 28 0 q14 -14 28 0" />
        <path d="M940 80 q10 -10 20 0 q10 -10 20 0" />
      </g>
      <path
        d="M0 430 L140 340 L280 390 L440 270 L590 370 L720 310 L880 380 L1030 290 L1200 350 V630 H0Z"
        fill="#bccdb1"
      />
      <path
        d="M0 490 C140 420 240 450 360 410 C480 370 580 460 720 430 C860 400 960 350 1080 400 C1140 425 1170 410 1200 400 V630 H0Z"
        fill="#94ae8a"
      />
      <path
        d="M0 560 C170 500 300 530 470 490 C640 450 780 530 950 510 C1080 495 1150 470 1200 480 V630 H0Z"
        fill="#6b8d65"
      />
      {pines.map((pine) => (
        <path
          key={pine.id}
          d={`M${pine.x} ${pine.y - pine.h} l${-pine.h / 2.6} ${pine.h} h${pine.h / 1.3} Z`}
          fill="#3f6447"
        />
      ))}
      <path
        d="M0 600 C200 570 400 600 600 585 C800 570 1000 605 1200 580 V630 H0Z"
        fill="#3f6447"
      />
    </svg>
  );
}

function SunsetArt() {
  const reflection = [180, 150, 120, 92, 66, 44];
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e07fb2" />
          <stop offset="0.5" stopColor="#a876cd" />
          <stop offset="1" stopColor="#7d6fd0" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff1c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sun" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff7da" />
          <stop offset="1" stopColor="#ffc56f" />
        </radialGradient>
      </defs>
      <g fill="#fff" opacity="0.4">
        <ellipse cx="960" cy="120" rx="150" ry="16" />
        <ellipse cx="1060" cy="150" rx="90" ry="11" />
      </g>
      <circle cx="1000" cy="420" r="240" fill="url(#glow)" />
      <circle cx="1000" cy="420" r="112" fill="url(#sun)" />
      <rect y="416" width={W} height={H - 416} fill="url(#sea)" />
      {reflection.map((width, index) => (
        <rect
          key={width}
          x={1000 - width / 2}
          y={432 + index * 22}
          width={width}
          height="7"
          rx="3.5"
          fill="#ffe3a8"
          opacity={0.8 - index * 0.11}
        />
      ))}
      <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.4">
        <path d="M0 520 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" />
        <path d="M-60 575 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" />
      </g>
      <path d="M1130 250 l6 15 l15 6 l-15 6 l-6 15 l-6 -15 l-15 -6 l15 -6 Z" fill="#fff" />
    </svg>
  );
}

function MidnightArt() {
  const next = random(5);
  const stars = Array.from({ length: 120 }, (_, id) => ({
    id,
    x: next() * W,
    y: next() * 470,
    r: 1 + next() * 2.4,
    o: 0.4 + next() * 0.6,
  }));
  const buildings: { id: number; x: number; w: number; h: number }[] = [];
  const windows: { id: string; x: number; y: number; c: string }[] = [];
  let x = -10;
  while (x < W + 10) {
    const w = 50 + next() * 70;
    const h = 70 + next() * 150;
    buildings.push({ id: buildings.length, x, w, h });
    for (let wy = H - h + 16; wy < H - 10; wy += 22) {
      for (let wx = x + 10; wx < x + w - 14; wx += 18) {
        const lit = next();
        if (lit > 0.74)
          windows.push({ id: `${wx}-${wy}`, x: wx, y: wy, c: lit > 0.94 ? "#7cf7d4" : "#ffd27a" });
      }
    }
    x += w + 5;
  }
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="neon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7cf7d4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7cf7d4" stopOpacity="0" />
        </radialGradient>
        <mask id="moon">
          <rect width={W} height={H} fill="#fff" />
          <circle cx="1068" cy="118" r="46" fill="#000" />
        </mask>
      </defs>
      {stars.map((star) => (
        <circle key={star.id} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.o} />
      ))}
      <ellipse cx="600" cy="640" rx="760" ry="170" fill="url(#neon)" />
      <circle cx="1040" cy="140" r="96" fill="#c4b5fd" opacity="0.14" />
      <circle cx="1040" cy="140" r="54" fill="#f3f1ff" mask="url(#moon)" />
      {buildings.map((building) => (
        <rect
          key={building.id}
          x={building.x}
          y={H - building.h}
          width={building.w}
          height={building.h}
          rx="4"
          fill="#070a18"
        />
      ))}
      {windows.map((window) => (
        <rect
          key={window.id}
          x={window.x}
          y={window.y}
          width="7"
          height="10"
          fill={window.c}
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

function CleanArt() {
  const dots: { id: string; x: number; y: number }[] = [];
  for (let y = 15; y < H; y += 30) {
    for (let x = 15; x < W; x += 30) dots.push({ id: `${x}-${y}`, x, y });
  }
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      {dots.map((dot) => (
        <circle key={dot.id} cx={dot.x} cy={dot.y} r="1.6" fill="#d2d6df" />
      ))}
      <rect x="899" y="0" width="2" height={H} fill="#e3e5eb" />
      <rect x="0" y="314" width={W} height="2" fill="#e3e5eb" />
    </svg>
  );
}

export function OgArt({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case "confetti":
      return <ConfettiArt />;
    case "wild":
      return <WildArt />;
    case "sunset":
      return <SunsetArt />;
    case "midnight":
      return <MidnightArt />;
    case "clean":
      return <CleanArt />;
  }
}
