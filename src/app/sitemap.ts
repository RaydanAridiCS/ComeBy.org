import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS } from "@/config/seo";
import { env } from "@/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL;
  return INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: "monthly",
  }));
}
