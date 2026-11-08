import { defineConfig, devices } from "@playwright/test";

import { ENV_KEYS } from "./src/lib/env";

// Two production servers from the same `next build`:
// - "configured" (E2E_PORT, default 3210) reads .env.local locally or the CI env;
// - "unconfigured" (E2E_PORT + 1) has every setting blanked, like a fresh fork.
// Blank values win over .env files, so the second server really runs with nothing set.
const PORT = Number(process.env.E2E_PORT ?? 3210);
const BARE_PORT = PORT + 1;
const baseURL = `http://localhost:${PORT}`;
const bareURL = `http://localhost:${BARE_PORT}`;

const blankEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, ""]));

export default defineConfig({
  testDir: "./tests/e2e",
  // Auth flows share one database and inbox; run them one at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "configured",
      testIgnore: /unconfigured\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL },
    },
    {
      name: "unconfigured",
      testMatch: /unconfigured\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: bareURL },
    },
  ],
  webServer: [
    {
      // Never reuse: a busy port should fail loudly, not silently test some other app.
      command: `npx next start -p ${PORT}`,
      url: `${baseURL}/api/auth/ok`,
      reuseExistingServer: false,
      timeout: 120_000,
      // Auth links and trusted origins must match the port under test.
      env: { APP_URL: baseURL },
    },
    {
      command: `npx next start -p ${BARE_PORT}`,
      url: `${bareURL}/setup`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: blankEnv,
    },
  ],
});
