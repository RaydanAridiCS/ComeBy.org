import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildCsp, originOf } from "./src/config/csp";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const s3PublicUrl = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL) : null;

// Set CSP_REPORT_ONLY=1 to log violations in the browser console without blocking anything,
// useful when trying a new third-party service before enforcing it.
const cspHeaderName =
  process.env.CSP_REPORT_ONLY === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

const contentSecurityPolicy = buildCsp({
  isDev: process.env.NODE_ENV === "development",
  umamiOrigin: originOf(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL),
  storageOrigin: originOf(process.env.S3_PUBLIC_URL),
});

const securityHeaders = [
  { key: cspHeaderName, value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Self-contained server output for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Cover images are up to 5 MB; leave room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  // Link previews in chat apps must see metadata in <head>, so these bots get a blocking render.
  // Next.js's default list plus Telegram, Viber, Pinterest and Snapchat.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Viber|Pinterest|Snapchat/i,
  images: {
    remotePatterns: s3PublicUrl
      ? [
          {
            protocol: s3PublicUrl.protocol === "http:" ? "http" : "https",
            hostname: s3PublicUrl.hostname,
          },
        ]
      : [],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
