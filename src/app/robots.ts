import type { MetadataRoute } from "next";
import { env } from "@/env";

/** Only the marketing pages are indexable. Invites are private and never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/privacy", "/terms"], disallow: ["/"] }],
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_APP_URL).toString(),
  };
}
