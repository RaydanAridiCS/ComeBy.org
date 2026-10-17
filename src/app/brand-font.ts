import { Bricolage_Grotesque } from "next/font/google";

/**
 * The app's heading face (`heading` utility, `font-heading`). Imported only by the
 * landing, dashboard, auth and legal layouts, so it's preloaded there and never on
 * the public invite page. Elsewhere headings fall back to Geist.
 */
export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});
