import { loadEnvConfig } from "@next/env";
import { afterAll } from "vitest";

// Load .env.local like `next dev` does. Next skips .env.local when NODE_ENV is "test"
// (which Vitest sets), so load in development mode for these database tests.
const nodeEnv = process.env.NODE_ENV;
Object.assign(process.env, { NODE_ENV: "development" });
loadEnvConfig(process.cwd(), true);
Object.assign(process.env, { NODE_ENV: nodeEnv });

if (!process.env.DATABASE_URL) {
  // In CI these tests guard the money path, so a missing database must fail, not skip.
  if (process.env.CI) throw new Error("[integration] DATABASE_URL must be set in CI.");
  console.warn("[integration] DATABASE_URL is not set: database tests are skipped.");
}

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  await closeDb();
});
