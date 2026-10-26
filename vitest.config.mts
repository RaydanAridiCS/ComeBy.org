import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside a React server environment; unit tests run in Node.
      "server-only": path.resolve(import.meta.dirname, "tests/unit/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // Business rules and security code: the parts where a regression costs the most.
      include: ["src/server/**", "src/lib/**", "src/config/**", "src/features/**/schema.ts"],
      exclude: ["src/server/repositories/drizzle/**", "src/server/adapters/**"],
      reporter: ["text-summary", "lcov"],
    },
    env: {
      SKIP_ENV_VALIDATION: "1",
      NEXT_PUBLIC_APP_URL: "https://comeby.test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
    },
  },
});
