import "server-only";

import pino from "pino";
import { env } from "@/env";

/**
 * Structured server logger. Logs JSON in production (easy to ship to any log tool)
 * and stays readable in development. Never log guests' phone numbers or emails.
 */
export const logger = pino({
  // Builds and tests that skip env validation get no defaults, hence the fallback.
  level: env.LOG_LEVEL ?? "info",
  base: { app: "comeby" },
  redact: {
    paths: ["*.email", "*.phone", "*.password", "*.token", "email", "phone", "password", "token"],
    censor: "[redacted]",
  },
});
