/** Only allow in-app paths after sign-in, never another site (open-redirect protection). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
