import "server-only";

import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { db } from "./client";

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1500;

function isLocalhostDb(): boolean {
  try {
    const parsed = new URL(env.DATABASE_URL);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  } catch {
    return false;
  }
}

/**
 * Early builds of migration 0001 added a `velvet` theme that was later renamed to
 * `bloom`. Postgres cannot use an enum value in the transaction that added it, so
 * the row fix runs here, after the migrations have committed. The `::text` cast
 * keeps it valid on databases where `velvet` never existed.
 */
async function repairLegacyThemes(): Promise<void> {
  await db.execute(sql`UPDATE events SET theme = 'bloom' WHERE theme::text = 'velvet'`);
}

/**
 * Applies pending SQL migrations from /drizzle. Runs automatically when the
 * server starts (see instrumentation.ts), so deploys need no extra step.
 * Retries on connection failure to allow the database container time to become ready.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await migrate(db, { migrationsFolder });
      await repairLegacyThemes();
      logger.info("Database migrations are up to date");
      return;
    } catch (error) {
      if (isLocalhostDb() && env.NODE_ENV === "production") {
        logger.error(
          { err: error, attempt },
          "Database connection refused: DATABASE_URL is set to localhost/127.0.0.1 in production. Inside Docker/Coolify containers, 'localhost' refers to the container itself. Use Coolify's internal database URL (e.g. postgres://user:pass@postgres-container:5432/db).",
        );
      }

      if (attempt === MAX_RETRIES) {
        logger.error({ err: error, attempt }, "Database migrations failed after max retries");
        throw error;
      }

      const delay = INITIAL_DELAY_MS * attempt;
      logger.warn(
        { err: error, attempt, nextRetryInMs: delay },
        `Database migration failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
