import { defineConfig, devices } from "@playwright/test";

// Own port so e2e never hits another app on 3000. Override with E2E_PORT if it is taken.
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    // Never reuse: a busy port should fail loudly, not silently test some other app.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
