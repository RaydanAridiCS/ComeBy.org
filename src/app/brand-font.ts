import { Bricolage_Grotesque } from "next/font/google";

/**
 * The app's heading face (`heading` utility, `font-heading`). Imported only by the
 * landing, dashboard, auth, admin and legal layouts, so it's preloaded there and never
 * on the public invite page. Elsewhere headings fall back to Geist.
 *
 * Never import this from a not-found, error or global-error file, or from anything they
 * use: those files belong to every route, so the font would be preloaded on the invite
 * page too. They use `brand-font-lazy.ts`.
 */
export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});
