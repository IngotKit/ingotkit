import { inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { user } from "@/db/schema";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

const created: string[] = [];

/** Inserts a bare user row (no signup hook) and remembers it for cleanup. */
export async function createTestUser(label = "test"): Promise<string> {
  const id = crypto.randomUUID();
  await getDb()
    .insert(user)
    .values({ id, name: label, email: `${label}-${id}@example.test`, emailVerified: true, updatedAt: new Date() });
  created.push(id);
  return id;
}

/** Deletes users made by createTestUser; their ledger rows go with them (ON DELETE CASCADE). */
export async function deleteTestUsers(): Promise<void> {
  if (created.length === 0) return;
  await getDb().delete(user).where(inArray(user.id, created.splice(0)));
}
