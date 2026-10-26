import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/*
 * Integration tests run the real repositories and services against a real Postgres.
 * A throwaway database is created and migrated before the run (see global-setup.ts).
 *   docker compose up -d && npm run test:integration
 * Any Postgres works: point TEST_DATABASE_ADMIN_URL at it (default: the docker compose one).
 */
const adminUrl =
  process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://comeby:comeby@localhost:5432/postgres";
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = "/comeby_integration";

// Read by global-setup.ts, which runs in this same process.
process.env.INTEGRATION_ADMIN_URL = adminUrl;
process.env.INTEGRATION_DATABASE_URL = databaseUrl.toString();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/unit/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // One database, so test files take turns.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      SKIP_ENV_VALIDATION: "1",
      DATABASE_URL: databaseUrl.toString(),
      NEXT_PUBLIC_APP_URL: "https://comeby.test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      LOG_LEVEL: "silent",
    },
  },
});
