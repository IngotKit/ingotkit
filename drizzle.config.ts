import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env, .env.local etc. the same way Next.js does, so `npm run db:*` sees DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // drizzle-kit only runs from the command line, so an empty value fails there with a
    // clear connection error instead of crashing the app.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
