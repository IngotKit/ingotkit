// AI generations as rows in `job`. Nothing runs in the background: a job is started inside a
// request, and finished by whichever arrives first: the provider's webhook, a status check
// while the user has the page open, or the /api/cron/poll-jobs route.
//
// Credits: reserve when the job is created, then exactly one of commit (succeeded) or refund
// (failed). settleJob moves a job out of queued/running with a conditional UPDATE and settles
// the credits in the same transaction, so racing webhooks and checks settle it only once.
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { siteConfig } from "@/config/site.config";
import type { Db, DbOrTx } from "@/db/client";
import { ACTIVE_JOB_STATUSES, job, type Job, type JobKind, type JobOutput } from "@/db/schema";
import { MediaProviderError, type MediaProvider, type MediaStatus } from "@/lib/ai/media";
import { commit, refund, reserve } from "@/lib/credits";

export { InsufficientCreditsError } from "@/lib/credits";

export class TooManyActiveJobsError extends Error {
  constructor(readonly limit: number) {
    super(`You already have ${limit} generations running. Wait for one to finish.`);
    this.name = "TooManyActiveJobsError";
  }
}

export type JobOutcome =
  | { status: "succeeded"; outputs?: JobOutput[]; expiresAt?: Date }
  | { status: "failed"; error: string };

/** Rows changed by an UPDATE (mysql2 returns [ResultSetHeader, …]). */
function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}

export async function getJob(db: DbOrTx, jobId: string): Promise<Job | undefined> {
  const [row] = await db.select().from(job).where(eq(job.id, jobId));
  return row;
}

export async function findJobByRequestId(db: DbOrTx, provider: string, requestId: string): Promise<Job | undefined> {
  const [row] = await db
    .select()
    .from(job)
    .where(and(eq(job.provider, provider), eq(job.providerRequestId, requestId)));
  return row;
}

export async function countActiveJobs(db: DbOrTx, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(job)
    .where(and(eq(job.userId, userId), inArray(job.status, ACTIVE_JOB_STATUSES), inArray(job.kind, ["image", "video"])));
  return Number(row?.n ?? 0);
}

export async function listJobs(db: DbOrTx, userId: string, options: { toolId?: string; limit?: number } = {}): Promise<Job[]> {
  return db
    .select()
    .from(job)
    .where(and(eq(job.userId, userId), options.toolId ? eq(job.toolId, options.toolId) : undefined))
    .orderBy(desc(job.createdAt))
    .limit(options.limit ?? 20);
}

/**
 * Moves an active job to its final status and settles its credits, once. Returns false if
 * another request already settled it.
 */
export async function settleJob(db: Db, jobId: string, outcome: JobOutcome): Promise<{ applied: boolean }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const result = await tx
      .update(job)
      .set(
        outcome.status === "succeeded"
          ? { status: "succeeded", output: outcome.outputs ?? null, outputExpiresAt: outcome.expiresAt ?? null, finishedAt: now }
          : { status: "failed", error: outcome.error.slice(0, 500), finishedAt: now },
      )
      .where(and(eq(job.id, jobId), inArray(job.status, ACTIVE_JOB_STATUSES)));
    if (affectedRows(result) !== 1) return { applied: false };

    if (outcome.status === "succeeded") await commit(tx, { jobId });
    else await refund(tx, { jobId, note: outcome.error.slice(0, 255) });
    return { applied: true };
  });
}

type NewJob = {
  userId: string;
  toolId: string;
  kind: JobKind;
  provider: string;
  credits: number;
  input: Record<string, unknown>;
};

/** Reserves credits and records the job. Throws InsufficientCreditsError if the balance is too low. */
async function createJob(db: Db, data: NewJob & { status: "queued" | "running" }): Promise<Job> {
  const id = crypto.randomUUID();
  await reserve(db, { userId: data.userId, jobId: id, amount: data.credits });
  try {
    await db.insert(job).values({ id, ...data });
  } catch (error) {
    await refund(db, { jobId: id, note: "could not record the job" });
    throw error;
  }
  return (await getJob(db, id))!;
}

/** For streaming chat: the reply is generated inside the request, so the job starts as running. */
export async function startChatJob(db: Db, data: Omit<NewJob, "kind">): Promise<Job> {
  return createJob(db, { ...data, kind: "chat", status: "running" });
}

/**
 * Starts an image or video job: reserves credits, records the job, then submits it to the
 * provider. If the provider refuses it, the job fails and the credits come straight back.
 */
export async function startMediaJob(
  db: Db,
  data: Omit<NewJob, "provider"> & {
    provider: MediaProvider;
    model: string;
    params: Record<string, unknown>;
    webhookUrl?: string;
  },
): Promise<Job> {
  const { provider, model, params, webhookUrl, ...rest } = data;
  const limit = siteConfig.jobs.maxActivePerUser;
  if ((await countActiveJobs(db, rest.userId)) >= limit) throw new TooManyActiveJobsError(limit);

  const created = await createJob(db, { ...rest, provider: provider.name, status: "queued" });
  try {
    const { requestId } = await provider.submit({ model, params, webhookUrl, idempotencyKey: created.id });
    await db
      .update(job)
      .set({ providerRequestId: requestId, status: "running" })
      .where(and(eq(job.id, created.id), eq(job.status, "queued")));
  } catch (error) {
    const message = error instanceof MediaProviderError ? error.userMessage : "The generator couldn't start this job.";
    if (!(error instanceof MediaProviderError) || error.options.status !== 400) console.error("[jobs] submit failed", error);
    await settleJob(db, created.id, { status: "failed", error: message });
  }
  return (await getJob(db, created.id))!;
}

function outcomeFromStatus(status: MediaStatus): JobOutcome | null {
  if (status.state === "pending") return null;
  if (status.state === "succeeded") return { status: "succeeded", outputs: status.outputs, expiresAt: status.expiresAt };
  return { status: "failed", error: status.error ?? "The generation failed." };
}

/**
 * Asks the provider about one active job and settles it if it has finished. Checks the same
 * job at most once per `minIntervalMs` across all callers. Provider errors are logged and
 * left for the next check. Returns the job's current row.
 */
export async function refreshJob(
  db: Db,
  current: Job,
  provider: MediaProvider,
  options: { minIntervalMs?: number; now?: Date } = {},
): Promise<Job> {
  if (!ACTIVE_JOB_STATUSES.includes(current.status as never) || !current.providerRequestId) return current;
  if (current.provider !== provider.name) return current;

  const now = options.now ?? new Date();
  const threshold = new Date(now.getTime() - (options.minIntervalMs ?? 0));
  const claimed = await db
    .update(job)
    .set({ lastCheckedAt: now })
    .where(and(eq(job.id, current.id), or(isNull(job.lastCheckedAt), lt(job.lastCheckedAt, threshold))));
  if (options.minIntervalMs && affectedRows(claimed) !== 1) return current;

  try {
    const outcome = outcomeFromStatus(await provider.getStatus(current.providerRequestId));
    if (outcome) await settleJob(db, current.id, outcome);
  } catch (error) {
    console.error(`[jobs] status check failed for ${current.id}`, error);
  }
  return (await getJob(db, current.id)) ?? current;
}

export type PollSummary = { checked: number; settled: number; timedOut: number };

/**
 * Cron fallback (/api/cron/poll-jobs): checks unfinished media jobs that haven't been checked
 * recently, and fails (refunding) anything older than the configured timeout.
 */
export async function pollActiveJobs(
  db: Db,
  provider: MediaProvider | null,
  options: { now?: Date; limit?: number } = {},
): Promise<PollSummary> {
  const now = options.now ?? new Date();
  const timeoutAt = new Date(now.getTime() - siteConfig.jobs.timeoutMinutes * 60_000);
  const recentlyChecked = new Date(now.getTime() - 30_000);
  const summary: PollSummary = { checked: 0, settled: 0, timedOut: 0 };

  const candidates = await db
    .select()
    .from(job)
    .where(
      and(
        inArray(job.status, ACTIVE_JOB_STATUSES),
        or(isNull(job.lastCheckedAt), lt(job.lastCheckedAt, recentlyChecked), lt(job.createdAt, timeoutAt)),
      ),
    )
    .orderBy(sql`${job.lastCheckedAt} is not null`, asc(job.lastCheckedAt), asc(job.createdAt))
    .limit(options.limit ?? 25);

  for (const candidate of candidates) {
    let current = candidate;
    if (provider && candidate.kind !== "chat") {
      summary.checked += 1;
      current = await refreshJob(db, candidate, provider, { now });
      if (!ACTIVE_JOB_STATUSES.includes(current.status as never)) {
        summary.settled += 1;
        continue;
      }
    }
    if (current.createdAt < timeoutAt) {
      const { applied } = await settleJob(db, current.id, {
        status: "failed",
        error: "The generation took too long and was stopped.",
      });
      if (applied) summary.timedOut += 1;
    }
  }
  return summary;
}
