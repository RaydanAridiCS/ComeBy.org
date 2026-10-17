import type { CSSProperties } from "react";
import type { ThemeId } from "@/features/events/schema";

/**
 * The five launch themes. One definition drives the invite page (as CSS variables),
 * the theme picker and the link-preview image, so they always match.
 * See docs/themes.md for how to add a theme.
 */
export type ThemeTokens = {
  id: ThemeId;
  emoji: string;
  /** Page background (any CSS background value). */
  background: string;
  /** Solid colour used where gradients can't be (e.g. browser UI). */
  backgroundSolid: string;
  card: string;
  cardBorder: string;
  foreground: string;
  muted: string;
  accent: string;
  accentForeground: string;
  /** Soft tint of the accent, for chips and selected states. */
  accentSoft: string;
  /** CSS variable of the display font from src/app/fonts.ts. */
  fontVariable: string;
  /** Whether text sits on a dark background. */
  dark: boolean;
};

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  confetti: {
    id: "confetti",
    emoji: "🎉",
    background: "#fff8f0",
    backgroundSolid: "#fff8f0",
    card: "#ffffff",
    cardBorder: "#ffe1cf",
    foreground: "#2a1a1f",
    muted: "#7a6670",
    accent: "#ff4f79",
    accentForeground: "#ffffff",
    accentSoft: "#ffe3ea",
    fontVariable: "--font-fredoka",
    dark: false,
  },
  wild: {
    id: "wild",
    emoji: "🌿",
    background: "linear-gradient(180deg, #e8efdf 0%, #f4f1e6 60%, #ece3cf 100%)",
    backgroundSolid: "#eef2e6",
    card: "#fbfbf6",
    cardBorder: "#d9dfcb",
    foreground: "#1f2d1f",
    muted: "#5e6b57",
    accent: "#2f6b3a",
    accentForeground: "#ffffff",
    accentSoft: "#dfe9d6",
    fontVariable: "--font-fraunces",
    dark: false,
  },
  sunset: {
    id: "sunset",
    emoji: "🌅",
    background: "linear-gradient(180deg, #ffb36b 0%, #ff8a7a 45%, #f06fa6 100%)",
    backgroundSolid: "#ff9a76",
    card: "rgba(255, 255, 255, 0.86)",
    cardBorder: "rgba(255, 255, 255, 0.6)",
    foreground: "#3a1e2a",
    muted: "#7d4f5f",
    accent: "#ff5a36",
    accentForeground: "#ffffff",
    accentSoft: "#ffe2d6",
    fontVariable: "--font-outfit",
    dark: false,
  },
  midnight: {
    id: "midnight",
    emoji: "🌙",
    background: "radial-gradient(ellipse at top, #1b2350 0%, #0b1020 55%, #070a15 100%)",
    backgroundSolid: "#0b1020",
    card: "rgba(20, 26, 46, 0.9)",
    cardBorder: "rgba(124, 247, 212, 0.18)",
    foreground: "#eef1ff",
    muted: "#9aa3c7",
    accent: "#7cf7d4",
    accentForeground: "#0b1020",
    accentSoft: "rgba(124, 247, 212, 0.14)",
    fontVariable: "--font-space-grotesk",
    dark: true,
  },
  clean: {
    id: "clean",
    emoji: "✨",
    background: "#f7f7f5",
    backgroundSolid: "#f7f7f5",
    card: "#ffffff",
    cardBorder: "#e7e5e4",
    foreground: "#18181b",
    muted: "#71717a",
    accent: "#2563eb",
    accentForeground: "#ffffff",
    accentSoft: "#e0e9fd",
    fontVariable: "--font-geist-sans",
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
    "--invite-accent-soft": theme.accentSoft,
    "--invite-font": `var(${theme.fontVariable})`,
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}
