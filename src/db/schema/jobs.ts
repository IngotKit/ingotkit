// One row per AI generation (a chat reply, an image, a video). Credits for a job are held in
// credit_ledger under the job's id: reserved when the row is created, then committed or
// refunded exactly once when the job reaches a final status.
import { index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";

export const JOB_STATUSES = [
  "queued", // created; credits reserved; not yet accepted by the provider
  "running", // the provider accepted it and is working on it
  "succeeded", // finished; credits committed
  "failed", // failed, rejected by moderation, canceled or timed out; credits refunded
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const ACTIVE_JOB_STATUSES = ["queued", "running"] as const satisfies readonly JobStatus[];

export type JobKind = "chat" | "image" | "video";

export type JobOutput = {
  kind: "image" | "video";
  url: string;
  contentType?: string;
};

export const job = mysqlTable(
  "job",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toolId: varchar("tool_id", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 16 }).$type<JobKind>().notNull(),
    /** "higgsfield", "anthropic", "openai", "fake"… */
    provider: varchar("provider", { length: 32 }).notNull(),
    /** The provider's id for this request; webhooks and polling look jobs up by it. */
    providerRequestId: varchar("provider_request_id", { length: 191 }).unique(),
    status: varchar("status", { length: 16 }).$type<JobStatus>().notNull(),
    credits: int("credits").notNull(),
    /** What the user asked for (prompt, settings, input image URL). Never secrets. */
    input: json("input").$type<Record<string, unknown>>().notNull(),
    output: json("output").$type<JobOutput[]>(),
    error: varchar("error", { length: 500 }),
    /** Provider result URLs stop working after this (Higgsfield: about 7 days). */
    outputExpiresAt: timestamp("output_expires_at", { fsp: 3 }),
    lastCheckedAt: timestamp("last_checked_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { fsp: 3 }),
  },
  (table) => [
    index("job_user_created_idx").on(table.userId, table.createdAt),
    index("job_status_created_idx").on(table.status, table.createdAt),
  ],
);

export type Job = typeof job.$inferSelect;
