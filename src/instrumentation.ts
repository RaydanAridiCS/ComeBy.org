import type { Instrumentation } from "next";

/**
 * Runs once when the Next.js server starts. Applies database migrations and
 * starts background workers (emails, notifications, daily clean-up).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_STARTUP_TASKS === "1") return;

  const { logger } = await import("@/lib/logger");
  try {
    const { runMigrations } = await import("@/db/migrate");
    await runMigrations();
    const { startWorkers } = await import("@/server/jobs/worker");
    await startWorkers();
  } catch (error) {
    logger.fatal({ err: error }, "Startup failed");
    throw error;
  }
}

/** Logs every server error with its route and forwards it to error reporting when configured. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/logger");
  logger.error(
    { err: error, path: request.path, method: request.method, route: context.routePath },
    "Request error",
  );
  // The route pattern (`/[slug]`) is reported, never the real path: invite links can carry secrets.
  const { reportError } = await import("@/server/monitoring/error-reporting");
  await reportError(error, {
    source: "server",
    route: context.routePath,
    method: request.method,
  });
};
