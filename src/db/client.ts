// Server code only. Not marked "server-only" because the seed script and tests import it too.
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { getEnv } from "@/lib/env";
import * as schema from "@/db/schema";

export type Db = MySql2Database<typeof schema>;

// Reuse one pool per process (and across dev hot reloads). Nothing connects at import time:
// the pool is created on the first getDb() call, so a missing DATABASE_URL never crashes boot.
const globalForDb = globalThis as unknown as { ingotkitDb?: Db; ingotkitPool?: mysql.Pool };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Open /setup to see what is missing.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function getDb(): Db {
  if (globalForDb.ingotkitDb) return globalForDb.ingotkitDb;

  const url = getEnv().DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();

  const pool = mysql.createPool({
    uri: url,
    connectionLimit: 5,
    // Hostinger stops idle apps; keep the pool small and let idle connections close.
    maxIdle: 2,
    idleTimeout: 60_000,
    enableKeepAlive: true,
  });

  const db = drizzle({ client: pool, schema, mode: "default" });
  globalForDb.ingotkitPool = pool;
  globalForDb.ingotkitDb = db;
  return db;
}

// For scripts (seed, tests) that must exit cleanly.
export async function closeDb(): Promise<void> {
  await globalForDb.ingotkitPool?.end();
  globalForDb.ingotkitPool = undefined;
  globalForDb.ingotkitDb = undefined;
}
