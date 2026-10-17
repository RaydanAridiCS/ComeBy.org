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
