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

function VelvetArt() {
  const next = random(41);
  const bubbles = Array.from({ length: 32 }, (_, id) => ({
    id,
    x: 780 + next() * 400,
    y: next() * H,
    r: 4 + next() * 10,
    opacity: 0.25 + next() * 0.45,
    color: next() > 0.4 ? "#f5ad78" : "#ffd4b2",
  }));

  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="og-velvet-glow" cx="0.8" cy="0.45" r="0.5">
          <stop offset="0%" stopColor="#f5ad78" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#c83b5e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#120308" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#og-velvet-glow)" />

      {/* Art deco concentric arches on the right */}
      <g fill="none" stroke="#f5ad78" strokeWidth="2" opacity="0.2">
        <circle cx="980" cy="320" r="280" />
        <circle cx="980" cy="320" r="220" />
        <circle cx="980" cy="320" r="160" />
        <line x1="700" y1="320" x2="1200" y2="320" />
      </g>

      {/* Floating champagne bokeh */}
      {bubbles.map((b) => (
        <circle key={b.id} cx={b.x} cy={b.y} r={b.r} fill={b.color} opacity={b.opacity} />
      ))}

      {/* Luxury Coupe Wine Glasses Clinking */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(935, 310) rotate(12)">
          <path d="M-65 -65 C-65 14 65 14 65 -65 Z" fill="#c83b5e" opacity="0.85" />
          <path
            d="M-55 -35 C-55 8 55 8 55 -35 C28 -26 -28 -26 -55 -35 Z"
            fill="#e8965a"
            opacity="0.9"
          />
          <path d="M-65 -65 C-65 18 65 18 65 -65" fill="none" stroke="#ffd8b8" strokeWidth="4.5" />
          <line x1="-65" y1="-65" x2="65" y2="-65" stroke="#ffe5cf" strokeWidth="3" opacity="0.8" />
          <line x1="0" y1="18" x2="0" y2="105" stroke="#ffd8b8" strokeWidth="5.5" />
          <path
            d="M-42 105 C-24 100 24 100 42 105"
            stroke="#ffd8b8"
            strokeWidth="5.5"
            fill="none"
          />
        </g>
        <g transform="translate(1035, 310) rotate(-12)">
          <path d="M-65 -65 C-65 14 65 14 65 -65 Z" fill="#c83b5e" opacity="0.85" />
          <path
            d="M-55 -35 C-55 8 55 8 55 -35 C28 -26 -28 -26 -55 -35 Z"
            fill="#e8965a"
            opacity="0.9"
          />
          <path d="M-65 -65 C-65 18 65 18 65 -65" fill="none" stroke="#ffd8b8" strokeWidth="4.5" />
          <line x1="-65" y1="-65" x2="65" y2="-65" stroke="#ffe5cf" strokeWidth="3" opacity="0.8" />
          <line x1="0" y1="18" x2="0" y2="105" stroke="#ffd8b8" strokeWidth="5.5" />
          <path
            d="M-42 105 C-24 100 24 100 42 105"
            stroke="#ffd8b8"
            strokeWidth="5.5"
            fill="none"
          />
        </g>
        <circle cx="985" cy="235" r="40" fill="#f5ad78" opacity="0.35" />
        <path
          d="M985 195 L991 228 L1025 235 L991 242 L985 275 L979 242 L945 235 L979 228 Z"
          fill="#ffffff"
        />
        <circle cx="985" cy="235" r="5" fill="#ffe2c4" />
      </g>
    </svg>
  );
}

function CyberArt() {
  const next = random(53);
  const stars = Array.from({ length: 24 }, (_, id) => ({
    id,
    x: 780 + next() * 400,
    y: 30 + next() * 280,
    r: 1.5 + next() * 2.5,
    c: next() > 0.5 ? "#00f0ff" : "#ff007f",
  }));

  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <linearGradient id="og-cyber-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe600" />
          <stop offset="50%" stopColor="#ff007f" />
          <stop offset="100%" stopColor="#7928ca" />
        </linearGradient>
        <linearGradient id="og-cyber-glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {stars.map((s) => (
        <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={0.8} />
      ))}

      <circle cx="980" cy="270" r="95" fill="url(#og-cyber-sun)" />
      <rect x="880" y="260" width="200" height="5" fill="#06070d" />
      <rect x="880" y="275" width="200" height="8" fill="#06070d" />
      <rect x="880" y="293" width="200" height="11" fill="#06070d" />
      <rect x="880" y="314" width="200" height="15" fill="#06070d" />
      <rect x="880" y="340" width="200" height="19" fill="#06070d" />

      <rect x="700" y="365" width="500" height="4" fill="url(#og-cyber-glow)" />

      <g stroke="#00f0ff" opacity="0.45" strokeWidth="2">
        <line x1="980" y1="365" x2="680" y2={H} />
        <line x1="980" y1="365" x2="760" y2={H} />
        <line x1="980" y1="365" x2="850" y2={H} />
        <line x1="980" y1="365" x2="940" y2={H} />
        <line x1="980" y1="365" x2="1020" y2={H} />
        <line x1="980" y1="365" x2="1110" y2={H} />
        <line x1="980" y1="365" x2="1200" y2={H} />
        <line x1="980" y1="365" x2="1280" y2={H} />

        <line x1="720" y1="385" x2="1200" y2="385" opacity="0.3" strokeWidth="1.5" />
        <line x1="720" y1="415" x2="1200" y2="415" opacity="0.45" strokeWidth="2" />
        <line x1="720" y1="460" x2="1200" y2="460" opacity="0.6" strokeWidth="2.5" />
        <line x1="720" y1="530" x2="1200" y2="530" opacity="0.8" strokeWidth="3" />
        <line x1="720" y1="620" x2="1200" y2="620" opacity="0.95" strokeWidth="3.5" />
      </g>
    </svg>
  );
}

function AuraArt() {
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="og-peach-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffb3ba" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ffdfba" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffdfba" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="og-violet-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#b388ff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#d1c4e9" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d1c4e9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="og-mint-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#b2dfdb" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#e0f2f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e0f2f1" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="920" cy="270" r="160" fill="url(#og-peach-aura)" />
      <circle cx="1060" cy="290" r="170" fill="url(#og-violet-aura)" />
      <circle cx="980" cy="410" r="140" fill="url(#og-mint-aura)" />

      <ellipse
        cx="990"
        cy="310"
        rx="220"
        ry="72"
        fill="none"
        stroke="#b388ff"
        strokeWidth="3.5"
        strokeDasharray="9 7"
        opacity="0.65"
        transform="rotate(-15 990 310)"
      />

      <path
        d="M1120 120 A 38 38 0 0 0 1162 168 A 31 31 0 0 1 1120 120 Z"
        fill="#7932c9"
        opacity="0.75"
      />

      <g fill="#7932c9">
        <path d="M990 140 L995 162 L1017 167 L995 172 L990 194 L985 172 L963 167 L985 162 Z" />
        <circle cx="990" cy="167" r="4" fill="#ffffff" />

        <path
          d="M840 210 L843 222 L855 225 L843 228 L840 240 L837 228 L825 225 L837 222 Z"
          fill="#a855f7"
        />
        <path
          d="M1130 380 L1133 392 L1145 395 L1133 398 L1130 410 L1127 398 L1115 395 L1127 392 Z"
          fill="#ec4899"
        />
        <circle cx="890" cy="460" r="6" fill="#b388ff" opacity="0.6" />
        <circle cx="1110" cy="230" r="5" fill="#7932c9" opacity="0.6" />
      </g>
    </svg>
  );
}

function OasisArt() {
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="og-flower-center" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#f77f00" />
        </radialGradient>
      </defs>

      <g fill="none" stroke="#ffffff" strokeWidth="4.5" opacity="0.35" strokeLinecap="round">
        <path d="M720 120 C800 80 870 170 980 110 C1090 50 1150 140 1240 90" />
        <path d="M740 240 C840 190 920 280 1020 230 C1120 180 1180 260 1260 210" />
        <path d="M710 380 C810 330 900 420 1030 360 C1150 300 1190 400 1270 340" />
        <path d="M750 510 C850 470 940 550 1060 490 C1170 440 1210 520 1280 480" />
        <path d="M860 60 C840 170 910 240 900 370 C890 420 930 480 940 540" opacity="0.25" />
        <path d="M1080 40 C1110 160 1050 260 1100 380 C1120 440 1080 500 1100 560" opacity="0.25" />
      </g>

      <g transform="translate(1010, 320)">
        <ellipse
          cx="0"
          cy="0"
          rx="90"
          ry="46"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          opacity="0.35"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="120"
          ry="62"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.2"
        />

        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M0 0 C-24 -46 24 -70 40 -30 C45 -5 20 0 0 0 Z"
            fill="#ff6b6b"
            transform={`rotate(${angle})`}
            opacity="0.95"
          />
        ))}
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={`in-${angle}`}
            d="M0 0 C-10 -22 10 -35 18 -15 C20 -2 10 0 0 0 Z"
            fill="#ffa07a"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="15" fill="url(#og-flower-center)" />
        <circle cx="0" cy="0" r="7" fill="#ffffff" opacity="0.8" />
      </g>

      <g fill="#0b525b" opacity="0.75">
        <path d="M1020 -40 Q1120 80 1240 120 Q1180 30 1100 -20 Z" />
        <path d="M1080 -60 Q1170 40 1260 210 Q1190 120 1130 10 Z" fill="#13676f" opacity="0.85" />
      </g>

      <g fill="#ffffff">
        <path
          d="M880 180 L883 192 L895 195 L883 198 L880 210 L877 198 L865 195 L877 192 Z"
          opacity="0.85"
        />
        <path
          d="M1140 440 L1142 450 L1152 452 L1142 454 L1140 464 L1138 454 L1128 452 L1138 450 Z"
          opacity="0.75"
        />
      </g>
    </svg>
  );
}

function MatchaArt() {
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={layer}>
      <defs>
        <radialGradient id="og-matcha-cup" cx="0.45" cy="0.45" r="0.5">
          <stop offset="0%" stopColor="#5a8542" />
          <stop offset="65%" stopColor="#43682f" />
          <stop offset="100%" stopColor="#2c471e" />
        </radialGradient>
      </defs>

      <g fill="none" stroke="#d5d0bd" strokeWidth="3" opacity="0.4">
        <circle cx="980" cy="330" r="230" />
        <circle cx="980" cy="330" r="280" />
        <circle cx="980" cy="330" r="330" />
      </g>

      <g transform="translate(980, 330)">
        <ellipse cx="5" cy="30" rx="155" ry="110" fill="#1a2014" opacity="0.14" />
        <ellipse
          cx="0"
          cy="20"
          rx="160"
          ry="110"
          fill="#f8f6f0"
          stroke="#d5d0bf"
          strokeWidth="3.5"
        />
        <ellipse cx="0" cy="20" rx="135" ry="90" fill="#ebe6d6" opacity="0.6" />

        <ellipse cx="0" cy="0" rx="115" ry="86" fill="#fcfbf7" stroke="#c9c4b1" strokeWidth="4.5" />
        <ellipse cx="0" cy="0" rx="102" ry="74" fill="url(#og-matcha-cup)" />

        <g fill="#fbfaf6" opacity="0.95">
          <path d="M0 -42 C-10 -56 -22 -44 -10 -30 L0 -18 L10 -30 C22 -44 10 -56 0 -42 Z" />
          <ellipse cx="-16" cy="-16" rx="12" ry="7" transform="rotate(-25 -16 -16)" />
          <ellipse cx="16" cy="-16" rx="12" ry="7" transform="rotate(25 16 -16)" />
          <ellipse cx="-20" cy="0" rx="14" ry="8" transform="rotate(-20 -20 0)" />
          <ellipse cx="20" cy="0" rx="14" ry="8" transform="rotate(20 20 0)" />
          <ellipse cx="-20" cy="18" rx="16" ry="9" transform="rotate(-15 -20 18)" />
          <ellipse cx="20" cy="18" rx="16" ry="9" transform="rotate(15 20 18)" />
          <line
            x1="0"
            y1="-24"
            x2="0"
            y2="42"
            stroke="#fbfaf6"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <circle cx="0" cy="42" r="7" fill="#fbfaf6" />
        </g>
      </g>

      <g fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.55">
        <path d="M940 180 Q915 135 945 95 Q965 65 940 30" />
        <path d="M1010 170 Q1040 125 1015 85 Q995 50 1025 20" />
      </g>

      <g transform="translate(800, 390) rotate(-30)">
        <path d="M0 0 C-18 -32 0 -58 40 -72 C48 -32 30 0 0 0 Z" fill="#588143" />
        <line x1="0" y1="0" x2="36" y2="-64" stroke="#3b5e29" strokeWidth="2.5" />
      </g>
      <g transform="translate(825, 420) rotate(35)">
        <path d="M0 0 C-14 -24 0 -46 32 -56 C38 -24 24 0 0 0 Z" fill="#6c9b53" opacity="0.9" />
        <line x1="0" y1="0" x2="28" y2="-48" stroke="#486f34" strokeWidth="2" />
      </g>
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
    case "velvet":
      return <VelvetArt />;
    case "cyber":
      return <CyberArt />;
    case "aura":
      return <AuraArt />;
    case "oasis":
      return <OasisArt />;
    case "matcha":
      return <MatchaArt />;
  }
}
