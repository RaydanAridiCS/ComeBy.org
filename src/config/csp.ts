/*
 * Content-Security-Policy. Imported by next.config.ts, so keep this file free of
 * path aliases and runtime imports.
 *
 * Why not nonces? A per-request nonce forces every page to render dynamically and is
 * incompatible with Partial Prerendering (see the Next.js CSP guide). Comeby relies on
 * Cache Components for fast invite pages, so scripts and styles allow 'unsafe-inline'.
 * The policy still blocks third-party scripts, plugins, framing, base-tag and form
 * hijacking, and limits where data can be sent.
 */

export type CspOptions = {
  isDev: boolean;
  /** Origin of the self-hosted Umami script, if configured. */
  umamiOrigin?: string | null;
  /** Origin of the public file bucket (covers served from S3/R2), if configured. */
  storageOrigin?: string | null;
  /** Cloudflare Turnstile is loaded on RSVP, sign-up and password-reset forms. */
  turnstile?: boolean;
};

const TURNSTILE = "https://challenges.cloudflare.com";

export function buildCsp({
  isDev,
  umamiOrigin,
  storageOrigin,
  turnstile = true,
}: CspOptions): string {
  const list = (...values: (string | false | null | undefined)[]) =>
    values.filter(Boolean).join(" ");

  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": list(
      "'self'",
      "'unsafe-inline'",
      isDev && "'unsafe-eval'",
      turnstile && TURNSTILE,
      umamiOrigin,
    ),
    "style-src": "'self' 'unsafe-inline'",
    "img-src": list("'self'", "data:", "blob:", storageOrigin),
    "font-src": "'self' data:",
    // Dev needs a websocket for hot reloading.
    "connect-src": list("'self'", umamiOrigin, turnstile && TURNSTILE, isDev && "ws: wss:"),
    "frame-src": turnstile ? TURNSTILE : "'none'",
    "worker-src": "'self'",
    "manifest-src": "'self'",
    "media-src": "'self'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  };

  const parts = Object.entries(directives).map(([name, value]) => `${name} ${value}`);
  // Upgrading would break plain-http local development.
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** The origin of a URL, or null when it's missing or malformed. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
