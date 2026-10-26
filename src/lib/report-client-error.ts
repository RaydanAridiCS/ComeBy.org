/**
 * Sends a browser-side error to our own `/api/client-error` route, which forwards it
 * to the configured error-reporting server (if any). Safe to call from error boundaries:
 * it never throws and sends nothing but the error text, its digest and the route.
 */
export function reportClientError(error: unknown): void {
  try {
    const known = error instanceof Error ? error : null;
    const digest = (error as { digest?: unknown } | null)?.digest;
    const payload = JSON.stringify({
      name: known?.name ?? "NonError",
      message: known?.message ?? "Non-error value thrown",
      stack: known?.stack,
      digest: typeof digest === "string" ? digest : undefined,
      route: window.location.pathname,
    });
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never cause a second error.
  }
}
