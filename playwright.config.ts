import { defineConfig, devices } from "@playwright/test";

import { ENV_KEYS } from "./src/lib/env";
import { TEST_POLAR_WEBHOOK_SECRET } from "./tests/helpers/polar-webhooks";

// Two production servers from the same `next build`:
// - "configured" (E2E_PORT, default 3210) reads .env.local locally or the CI env;
// - "unconfigured" (E2E_PORT + 1) has every setting blanked, like a fresh fork.
// Blank values win over .env files, so the second server really runs with nothing set.
const PORT = Number(process.env.E2E_PORT ?? 3210);
const BARE_PORT = PORT + 1;
const baseURL = `http://localhost:${PORT}`;
const bareURL = `http://localhost:${BARE_PORT}`;

/** Test-only value; the cron route test sends it. */
export const E2E_CRON_SECRET = "e2e-cron-secret-not-a-real-one";

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
      // Auth links and trusted origins must match the port under test. Polar uses test-only
      // values: tests sign webhooks with this secret, and the token is never used for real calls.
      // WEBHOOK_BASE_URL is blanked so jobs finish by status checks, as on plain-http localhost.
      env: {
        APP_URL: baseURL,
        POLAR_ACCESS_TOKEN: "polar_e2e_not_a_real_token",
        POLAR_WEBHOOK_SECRET: TEST_POLAR_WEBHOOK_SECRET,
        POLAR_SERVER: "sandbox",
        // Image/video tools use the free test provider: no Higgsfield calls, deterministic results.
        FAKE_MEDIA_PROVIDER: "1",
        WEBHOOK_BASE_URL: "",
        CRON_SECRET: E2E_CRON_SECRET,
      },
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
