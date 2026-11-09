// Append-only credits ledger. A user's balance is SUM(amount) of their rows; there is no
// stored balance column. Every row has a unique idempotency key, so retries can't double-count.
import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";

export const CREDIT_KINDS = [
  "signup", // free credits for a new account
  "purchase", // a credit pack was paid for
  "subscription", // the monthly plan started or renewed
  "adjustment", // manual change by an admin (Phase 5)
  "reserve", // credits held for a job (negative)
  "commit", // job finished; returns any unused part of the reservation
  "refund", // job failed; returns the whole reservation
] as const;

export type CreditKind = (typeof CREDIT_KINDS)[number];

export const creditLedger = mysqlTable(
  "credit_ledger",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Positive adds credits, negative spends them. */
    amount: int("amount").notNull(),
    kind: varchar("kind", { length: 24 }).$type<CreditKind>().notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull().unique(),
    jobId: varchar("job_id", { length: 64 }),
    /** External reference, e.g. "polar:order:<id>". */
    reference: varchar("reference", { length: 255 }),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index("credit_ledger_user_idx").on(table.userId), index("credit_ledger_job_idx").on(table.jobId)],
);
