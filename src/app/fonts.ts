import { Fraunces, Fredoka, Geist, Geist_Mono, Outfit, Space_Grotesk } from "next/font/google";

/*
 * Fonts are self-hosted by next/font (no requests to Google from visitors).
 * Browsers only download a theme's font when an invite actually uses it.
 */

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
export const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
export const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
export const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  fredoka.variable,
  fraunces.variable,
  outfit.variable,
  spaceGrotesk.variable,
].join(" ");
