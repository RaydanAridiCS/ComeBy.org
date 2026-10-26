import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Creates a fresh database, applies every migration, and drops it again afterwards. */
export default async function setup() {
  const adminUrl = process.env.INTEGRATION_ADMIN_URL;
  const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
  if (!adminUrl || !databaseUrl) throw new Error("Run through vitest.integration.config.mts");
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });

  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${databaseName}`);
  } catch (error) {
    await admin.end();
    throw new Error(
      `Could not reach Postgres at ${adminUrl}. Start it with "docker compose up -d" ` +
        `or set TEST_DATABASE_ADMIN_URL. ${error instanceof Error ? error.message : ""}`,
    );
  }

  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  await migrate(drizzle({ client }), { migrationsFolder: path.resolve("drizzle") });
  await client.end();

  return async () => {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
    await admin.end();
  };
}
