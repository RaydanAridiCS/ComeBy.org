import type { CSSProperties } from "react";
import type { ThemeId } from "@/features/events/schema";

/**
 * The five launch themes. One definition drives the invite page (as CSS variables),
 * the theme previews, the celebration and the link-preview image, so they always match.
 * See docs/themes.md for how to add a theme, and run
 * `npx tsx scripts/check-theme-contrast.ts` after changing any colour.
 */
export type ThemeTokens = {
  id: ThemeId;
  emoji: string;
  /** Page background (any CSS background value). */
  background: string;
  /** Solid colour used where gradients can't be (browser UI, fallbacks). */
  backgroundSolid: string;
  /** Darkest and lightest backdrop colours, used to check glass-card contrast. */
  contrastBackdrops: string[];
  card: string;
  cardBorder: string;
  /** How the card is drawn: opaque, frosted glass, or warm paper. */
  surface: "solid" | "glass" | "paper";
  foreground: string;
  muted: string;
  /** Fill colour for buttons and selected states. */
  accent: string;
  accentForeground: string;
  /** Accent colour that is safe for text and icons on the card (AA). */
  accentInk: string;
  /** Soft tint of the accent, for chips and panels. */
  accentSoft: string;
  /** CSS variable of the display font from src/app/fonts.ts. */
  fontVariable: string;
  displayWeight: number;
  displayTracking: string;
  /** Relative size of the display font (wide faces run smaller). */
  displayScale: number;
  /** Colours for the "You're in!" confetti burst. */
  confettiColors: string[];
  /** Background/text pairs for guests' initials. */
  avatarTones: [string, string][];
  /** Link-preview background (gradients only; rendered by next/og). */
  ogBackground: string;
  /** Whether text sits on a dark background. */
  dark: boolean;
};

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  confetti: {
    id: "confetti",
    emoji: "🎉",
    background:
      "radial-gradient(70% 45% at 8% 0%, #ffd6e2 0%, transparent 70%), radial-gradient(60% 40% at 100% 8%, #e8ddff 0%, transparent 70%), radial-gradient(80% 50% at 50% 100%, #fff0c7 0%, transparent 70%), #fff7f3",
    backgroundSolid: "#fff7f3",
    contrastBackdrops: ["#fff7f3"],
    card: "#ffffff",
    cardBorder: "rgba(224, 36, 94, 0.12)",
    surface: "solid",
    foreground: "#2b1621",
    muted: "#6d5260",
    accent: "#e0245e",
    accentForeground: "#ffffff",
    accentInk: "#c21a52",
    accentSoft: "#ffe8ef",
    fontVariable: "--font-fredoka",
    displayWeight: 700,
    displayTracking: "-0.015em",
    displayScale: 1.05,
    confettiColors: ["#e0245e", "#ffb627", "#3ec5ff", "#8b5cf6", "#22c55e", "#ff7a45"],
    avatarTones: [
      ["#ffe1ea", "#9c1442"],
      ["#fff1c9", "#7a4a00"],
      ["#dff4ff", "#0b5a80"],
      ["#ece4ff", "#5b2fc2"],
    ],
    ogBackground:
      "radial-gradient(circle at 0% 0%, #ffd6e2 0%, rgba(255,214,226,0) 45%), radial-gradient(circle at 100% 0%, #e8ddff 0%, rgba(232,221,255,0) 45%), linear-gradient(180deg, #fff7f3 0%, #fff0e6 100%)",
    dark: false,
  },
  wild: {
    id: "wild",
    emoji: "🌿",
    background: "linear-gradient(180deg, #dfe9d3 0%, #f1efe2 42%, #efe5cf 100%)",
    backgroundSolid: "#eeefe2",
    contrastBackdrops: ["#dfe9d3", "#efe5cf"],
    card: "#fbf9f1",
    cardBorder: "#ddd8c3",
    surface: "paper",
    foreground: "#1d291d",
    muted: "#535f4c",
    accent: "#2f5d3a",
    accentForeground: "#ffffff",
    accentInk: "#2f5d3a",
    accentSoft: "#e4ebd8",
    fontVariable: "--font-fraunces",
    displayWeight: 600,
    displayTracking: "-0.025em",
    displayScale: 1.04,
    confettiColors: ["#2f5d3a", "#7a9a5b", "#c9a45c", "#a3b18a", "#e0c27a", "#5e8c61"],
    avatarTones: [
      ["#e1ead3", "#2f5d3a"],
      ["#f3e6c8", "#6b4d12"],
      ["#e6e2d3", "#4a4535"],
      ["#d9e7e0", "#245145"],
    ],
    ogBackground: "linear-gradient(180deg, #dfe9d3 0%, #f1efe2 55%, #efe5cf 100%)",
    dark: false,
  },
  sunset: {
    id: "sunset",
    emoji: "🌅",
    background:
      "linear-gradient(180deg, #ffd29e 0%, #ffab8b 26%, #f98ba6 52%, #c97cc8 78%, #8b72d1 100%)",
    backgroundSolid: "#f99a98",
    contrastBackdrops: ["#ffd29e", "#8b72d1"],
    card: "rgba(255, 255, 255, 0.82)",
    cardBorder: "rgba(255, 255, 255, 0.7)",
    surface: "glass",
    foreground: "#2f1226",
    muted: "#683c56",
    accent: "#d12f5f",
    accentForeground: "#ffffff",
    accentInk: "#a91f4c",
    accentSoft: "rgba(255, 214, 222, 0.7)",
    fontVariable: "--font-instrument-serif",
    displayWeight: 400,
    displayTracking: "-0.01em",
    displayScale: 1.22,
    confettiColors: ["#ffd29e", "#ff8a7a", "#f06fa6", "#c97cc8", "#ffe08a", "#ffffff"],
    avatarTones: [
      ["#ffe2d1", "#8a2f12"],
      ["#ffd9e6", "#97194a"],
      ["#efdcf5", "#6a2a7f"],
      ["#e3defa", "#43328f"],
    ],
    ogBackground:
      "linear-gradient(180deg, #ffd29e 0%, #ffab8b 30%, #f98ba6 58%, #c97cc8 82%, #8b72d1 100%)",
    dark: false,
  },
  midnight: {
    id: "midnight",
    emoji: "🌙",
    background:
      "radial-gradient(120% 65% at 50% -8%, #26347f 0%, #101741 42%, #080b1b 78%, #06080f 100%)",
    backgroundSolid: "#0b1020",
    contrastBackdrops: ["#26347f", "#06080f"],
    card: "rgba(14, 19, 44, 0.78)",
    cardBorder: "rgba(150, 168, 255, 0.2)",
    surface: "glass",
    foreground: "#eef1ff",
    muted: "#a7afd6",
    accent: "#7cf7d4",
    accentForeground: "#06231b",
    accentInk: "#7cf7d4",
    accentSoft: "rgba(124, 247, 212, 0.12)",
    fontVariable: "--font-unbounded",
    displayWeight: 700,
    displayTracking: "-0.035em",
    displayScale: 0.84,
    confettiColors: ["#7cf7d4", "#a78bfa", "#f0abfc", "#60a5fa", "#fde68a", "#ffffff"],
    avatarTones: [
      ["#173c3a", "#7cf7d4"],
      ["#2a2257", "#c4b5fd"],
      ["#3a1f4a", "#f0abfc"],
      ["#18305a", "#93c5fd"],
    ],
    ogBackground:
      "radial-gradient(circle at 50% -20%, #26347f 0%, #101741 45%, #080b1b 80%, #06080f 100%)",
    dark: true,
  },
  clean: {
    id: "clean",
    emoji: "✨",
    background:
      "radial-gradient(circle at 1px 1px, #d2d6df 1px, transparent 1.4px) 0 0 / 20px 20px, #f5f6f8",
    backgroundSolid: "#f5f6f8",
    contrastBackdrops: ["#f5f6f8"],
    card: "#ffffff",
    cardBorder: "#e3e5eb",
    surface: "solid",
    foreground: "#111522",
    muted: "#5a6173",
    accent: "#224bb2",
    accentForeground: "#ffffff",
    accentInk: "#224bb2",
    accentSoft: "#eef3ff",
    fontVariable: "--font-geist-sans",
    displayWeight: 650,
    displayTracking: "-0.045em",
    displayScale: 1,
    confettiColors: ["#224bb2", "#6c95ee", "#c2d8ff", "#111522", "#9dbdfe", "#426ed2"],
    avatarTones: [
      ["#eef3ff", "#173b97"],
      ["#f1f2f5", "#2b3142"],
      ["#e4ecff", "#224bb2"],
      ["#eceef3", "#3d4456"],
    ],
    ogBackground: "linear-gradient(180deg, #f8f9fb 0%, #eef0f4 100%)",
    dark: false,
  },
  bloom: {
    id: "bloom",
    emoji: "🌸",
    background:
      "radial-gradient(75% 55% at 90% 10%, #ffd6e0 0%, transparent 65%), radial-gradient(70% 50% at 10% 90%, #ffe8d6 0%, transparent 65%), #fff7f9",
    backgroundSolid: "#fff7f9",
    contrastBackdrops: ["#ffd6e0", "#ffe8d6"],
    card: "rgba(255, 255, 255, 0.90)",
    cardBorder: "rgba(209, 77, 114, 0.16)",
    surface: "glass",
    foreground: "#2e111a",
    muted: "#6d4653",
    accent: "#c2295a",
    accentForeground: "#ffffff",
    accentInk: "#a81c4a",
    accentSoft: "rgba(244, 114, 154, 0.15)",
    fontVariable: "--font-instrument-serif",
    displayWeight: 400,
    displayTracking: "-0.01em",
    displayScale: 1.22,
    confettiColors: ["#f47298", "#ff9ebb", "#ffd1dc", "#e84393", "#ffd6e0", "#ffffff"],
    avatarTones: [
      ["#fde8ef", "#a81c4a"],
      ["#ffedea", "#9e2a2b"],
      ["#f5e6ff", "#7b1fa2"],
      ["#fff2d6", "#8a5800"],
    ],
    ogBackground:
      "radial-gradient(circle at 80% 20%, #ffd6e0 0%, rgba(255, 214, 224, 0) 50%), linear-gradient(135deg, #fff2f5 0%, #fee4ec 50%, #fdeff4 100%)",
    dark: false,
  },
  cyber: {
    id: "cyber",
    emoji: "⚡",
    background:
      "radial-gradient(85% 60% at 20% 0%, rgba(255, 0, 128, 0.28) 0%, transparent 60%), radial-gradient(75% 55% at 85% 10%, rgba(0, 240, 255, 0.25) 0%, transparent 60%), #06070d",
    backgroundSolid: "#06070d",
    contrastBackdrops: ["#16081e", "#06070d"],
    card: "rgba(12, 14, 26, 0.86)",
    cardBorder: "rgba(0, 240, 255, 0.28)",
    surface: "glass",
    foreground: "#f1f5f9",
    muted: "#94a3b8",
    accent: "#00f0ff",
    accentForeground: "#031720",
    accentInk: "#00f0ff",
    accentSoft: "rgba(0, 240, 255, 0.14)",
    fontVariable: "--font-unbounded",
    displayWeight: 700,
    displayTracking: "-0.035em",
    displayScale: 0.86,
    confettiColors: ["#00f0ff", "#ff007f", "#ffe600", "#a855f7", "#39ff14", "#ffffff"],
    avatarTones: [
      ["#082433", "#00f0ff"],
      ["#300922", "#ff3b9a"],
      ["#22133b", "#c084fc"],
      ["#2b2808", "#ffe600"],
    ],
    ogBackground:
      "radial-gradient(circle at 80% 20%, rgba(255, 0, 128, 0.35) 0%, rgba(0, 240, 255, 0.2) 45%, #06070d 80%)",
    dark: true,
  },
  aura: {
    id: "aura",
    emoji: "🔮",
    background:
      "radial-gradient(70% 60% at 15% 15%, #ffd5e5 0%, transparent 65%), radial-gradient(70% 60% at 85% 20%, #d8e5ff 0%, transparent 65%), radial-gradient(60% 60% at 50% 85%, #dff7ea 0%, transparent 70%), #faf7fe",
    backgroundSolid: "#f8f4fc",
    contrastBackdrops: ["#ffd5e5", "#d8e5ff"],
    card: "rgba(255, 255, 255, 0.85)",
    cardBorder: "rgba(180, 160, 230, 0.35)",
    surface: "glass",
    foreground: "#211333",
    muted: "#655478",
    accent: "#7932c9",
    accentForeground: "#ffffff",
    accentInk: "#6821b8",
    accentSoft: "rgba(186, 140, 245, 0.18)",
    fontVariable: "--font-fraunces",
    displayWeight: 600,
    displayTracking: "-0.025em",
    displayScale: 1.06,
    confettiColors: ["#b388ff", "#ff80ab", "#80d8ff", "#ffd180", "#b9f6ca", "#ffffff"],
    avatarTones: [
      ["#f1e7fe", "#6821b8"],
      ["#ffebf2", "#a81954"],
      ["#e1f5fe", "#0277bd"],
      ["#e8f8f0", "#1b7a48"],
    ],
    ogBackground: "linear-gradient(135deg, #ffd8e8 0%, #e3d9fc 45%, #d4eeff 100%)",
    dark: false,
  },
  oasis: {
    id: "oasis",
    emoji: "🌴",
    background:
      "radial-gradient(80% 50% at 100% 0%, #b8f0ea 0%, transparent 60%), radial-gradient(75% 55% at 0% 100%, #ffe3cb 0%, transparent 65%), #eef9f8",
    backgroundSolid: "#eef9f8",
    contrastBackdrops: ["#b8f0ea", "#ffe3cb"],
    card: "rgba(255, 255, 255, 0.88)",
    cardBorder: "rgba(14, 140, 140, 0.18)",
    surface: "glass",
    foreground: "#0d292a",
    muted: "#386161",
    accent: "#0c7f7f",
    accentForeground: "#ffffff",
    accentInk: "#076363",
    accentSoft: "rgba(12, 127, 127, 0.12)",
    fontVariable: "--font-fredoka",
    displayWeight: 650,
    displayTracking: "-0.015em",
    displayScale: 1.05,
    confettiColors: ["#0e8b8b", "#ff7b54", "#ffd152", "#48cae4", "#2ec4b6", "#ff5964"],
    avatarTones: [
      ["#ddf5f3", "#076363"],
      ["#ffeedd", "#9a4411"],
      ["#dcf4fc", "#006487"],
      ["#e2f8ec", "#126b3c"],
    ],
    ogBackground: "linear-gradient(135deg, #bcf3eb 0%, #ddf7f3 40%, #ffdfc7 100%)",
    dark: false,
  },
  matcha: {
    id: "matcha",
    emoji: "🍵",
    background: "linear-gradient(180deg, #e3ecdc 0%, #f4f2e9 45%, #ede9dc 100%)",
    backgroundSolid: "#f1efe5",
    contrastBackdrops: ["#e3ecdc", "#ede9dc"],
    card: "#fcfbf7",
    cardBorder: "#d9d6c5",
    surface: "paper",
    foreground: "#23281c",
    muted: "#5a634e",
    accent: "#4a7037",
    accentForeground: "#ffffff",
    accentInk: "#385727",
    accentSoft: "#e7eedf",
    fontVariable: "--font-fraunces",
    displayWeight: 600,
    displayTracking: "-0.025em",
    displayScale: 1.04,
    confettiColors: ["#4a7037", "#8ba869", "#d4a373", "#e9edc9", "#ccd5ae", "#ffffff"],
    avatarTones: [
      ["#e3ebd9", "#385727"],
      ["#f3ead9", "#784e1b"],
      ["#e6e5db", "#48493d"],
      ["#e1eade", "#2f5c40"],
    ],
    ogBackground: "linear-gradient(180deg, #e1ebd9 0%, #f4f2e9 50%, #ede7d6 100%)",
    dark: false,
  },
};

export const THEME_LIST: ThemeTokens[] = Object.values(THEME_TOKENS);

/** CSS variables for an invite page; consumed by the `invite-*` utilities in globals.css. */
export function themeStyle(id: ThemeId): CSSProperties {
  const theme = THEME_TOKENS[id];
  return {
    "--invite-bg": theme.background,
    "--invite-bg-solid": theme.backgroundSolid,
    "--invite-card": theme.card,
    "--invite-card-border": theme.cardBorder,
    "--invite-fg": theme.foreground,
    "--invite-muted": theme.muted,
    "--invite-accent": theme.accent,
    "--invite-accent-fg": theme.accentForeground,
    "--invite-accent-ink": theme.accentInk,
    "--invite-accent-soft": theme.accentSoft,
    "--invite-font": `var(${theme.fontVariable})`,
    "--invite-display-weight": theme.displayWeight,
    "--invite-display-tracking": theme.displayTracking,
    "--invite-display-scale": theme.displayScale,
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}

/** A stable colour pair for a guest's initial, so the same name always looks the same. */
export function avatarTone(theme: ThemeTokens, name: string): [string, string] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return theme.avatarTones[hash % theme.avatarTones.length] ?? [theme.accentSoft, theme.accentInk];
}
