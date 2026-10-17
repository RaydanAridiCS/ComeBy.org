import "server-only";

import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { logger } from "@/lib/logger";
import { db } from "./client";

/**
 * Applies pending SQL migrations from /drizzle. Runs automatically when the
 * server starts (see instrumentation.ts), so deploys need no extra step.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations are up to date");
}
