import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL;
  return ["/", "/privacy", "/terms", "/signup"].map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: "monthly",
  }));
}
