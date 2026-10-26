import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS } from "@/config/seo";
import { env } from "@/env";

/** Only the marketing pages are indexable. Invites are private and never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // "$" anchors the home page, otherwise "/" would allow everything.
        allow: INDEXABLE_PATHS.map((path) => (path === "/" ? "/$" : path)),
        disallow: ["/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_APP_URL).toString(),
  };
}
