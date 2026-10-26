import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They need a real database and Mailpit:
 *   docker compose up -d
 *   npm run test:e2e
 * If the app isn't already running on E2E_BASE_URL, Playwright starts it with `npm run dev`.
 * For production-like runs, `npm run build && npm start` first (CI does this): it is reused.
 * Set E2E_ADMIN_EMAIL (and start the app with ADMIN_EMAILS=<same address>) to run the admin tests.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Each test starts a browser plus real emails and jobs; two at a time keeps slow machines reliable.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 180_000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Admin tests share one account, so they run once.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /admin\.spec\.ts/ },
  ],
});
