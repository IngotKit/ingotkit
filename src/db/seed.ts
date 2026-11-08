// Seed script: `npm run db:seed`. Checks the database connection for now; demo data
// (an admin user, sample credits) arrives with the auth and credits phases.
import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  // Imported after the env is loaded so getEnv() sees .env values.
  const { getDb, closeDb } = await import("@/db/client");
  try {
    const db = getDb();
    const [rows] = await db.execute(sql`select version() as version`);
    const version = (rows as unknown as Array<{ version: string }>)[0]?.version;
    console.log(`Connected to MySQL ${version}. Nothing to seed yet.`);
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
