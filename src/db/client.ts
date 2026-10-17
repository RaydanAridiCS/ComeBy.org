import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** Transaction handle accepted anywhere a `Database` is (repositories take either). */
export type DatabaseOrTransaction =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as {
  comebySql?: ReturnType<typeof postgres>;
  comebyDb?: Database;
};

function createDatabase(): Database {
  const sql = globalForDb.comebySql ?? postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} });
  if (env.NODE_ENV !== "production") globalForDb.comebySql = sql;
  return drizzle({ client: sql, schema, casing: "snake_case" });
}

/**
 * The shared database connection. Reused across hot reloads in development so we
 * don't open a new connection pool on every file change.
 */
export const db: Database = globalForDb.comebyDb ?? createDatabase();
if (env.NODE_ENV !== "production") globalForDb.comebyDb = db;
