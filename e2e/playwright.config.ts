import { defineConfig } from "@playwright/test";

/**
 * Runs against an already running stack (`docker compose up`), the same way a
 * reviewer uses it. Nothing is mocked: real pages, API, MongoDB and Mailpit.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // Use an installed browser (e.g. PW_CHANNEL=msedge or chrome) instead of
    // downloading one with `npm run install-browser`.
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
});
