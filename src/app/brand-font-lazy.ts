import { Bricolage_Grotesque } from "next/font/google";

/**
 * The same heading face as `brand-font.ts`, without the preload, for the not-found and
 * error files. Those files are part of every route, the invite included, and a
 * preloaded font is fetched by every page that can reach it. With `preload: false` a
 * browser only downloads the font when one of those screens is actually shown.
 */
export const bricolageLazy = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
});
