import { Fraunces, Fredoka, Geist, Geist_Mono, Unbounded } from "next/font/google";
import localFont from "next/font/local";

/*
 * Fonts are self-hosted by next/font (no requests to Google from visitors).
 * Only Geist is preloaded everywhere. Bricolage (app headings) lives in
 * brand-font.ts so the public invite page never downloads it. Theme and accent
 * fonts use `preload: false`, so a browser only downloads one when a page uses it.
 */

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});
// Self-hosted files (latin subset, OFL): Google's loader is unreliable for two-style families.
export const instrumentSerif = localFont({
  variable: "--font-instrument-serif",
  src: [
    { path: "./fonts/instrument-serif-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  preload: false,
});
export const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  preload: false,
});
export const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  preload: false,
});

export const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  instrumentSerif.variable,
  fredoka.variable,
  fraunces.variable,
  unbounded.variable,
].join(" ");
