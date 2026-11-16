/** Only allow in-app paths after sign-in, never another site (open-redirect protection). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

/**
 * Where a brand-new account goes when nothing else was asked for. The route sends a host with
 * no events to the new-event form and everyone else to their events
 * (`src/app/dashboard/start/route.ts`).
 */
export const FIRST_RUN_PATH = "/dashboard/start";

/** Where to go after confirming a new account: the page that was asked for, or the first run. */
export function firstRunNext(value: string | null | undefined): string {
  return safeNext(value, FIRST_RUN_PATH);
}
