import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { job } from "@/db/schema";
import { MediaProviderError, type MediaProvider, type MediaStatus } from "@/lib/ai/media";
import { getBalance, grant } from "@/lib/credits";
import {
  InsufficientCreditsError,
  pollActiveJobs,
  refreshJob,
  settleJob,
  startChatJob,
  startMediaJob,
  TooManyActiveJobsError,
} from "@/lib/jobs";

import { createTestUser, deleteTestUsers, hasDatabase } from "./helpers";

/** A provider whose status answers the test controls. */
function controllableProvider(options: { submitError?: Error } = {}) {
  const statuses = new Map<string, MediaStatus>();
  let statusCalls = 0;
  const provider: MediaProvider = {
    name: "fake",
    async submit() {
      if (options.submitError) throw options.submitError;
      const requestId = `test_${crypto.randomUUID()}`;
      statuses.set(requestId, { state: "pending" });
      return { requestId };
    },
    async getStatus(requestId) {
      statusCalls += 1;
      return statuses.get(requestId) ?? { state: "pending" };
    },
    async verifyWebhook() {
      return { requestId: "" };
    },
    async uploadInput() {
      return { url: "https://files/x.png" };
    },
  };
  return {
    provider,
    finish: (requestId: string, status: MediaStatus) => statuses.set(requestId, status),
    statusCalls: () => statusCalls,
  };
}

const COST = 5;

async function userWithCredits(amount = 20) {
  const userId = await createTestUser("jobs");
  await grant(getDb(), { userId, amount, kind: "adjustment", idempotencyKey: `test:${userId}` });
  return userId;
}

function startImage(userId: string, provider: MediaProvider, prompt = "a lighthouse") {
  return startMediaJob(getDb(), {
    userId,
    toolId: "image",
    kind: "image",
    credits: COST,
    input: { prompt },
    provider,
    model: "z-image/turbo",
    params: { prompt },
  });
}

describe.skipIf(!hasDatabase)("jobs and credits (MySQL)", () => {
  const db = () => getDb();

  afterAll(async () => {
    await deleteTestUsers();
  });

  it("holds credits while running and keeps them when the job succeeds", async () => {
    const userId = await userWithCredits();
    const { provider, finish } = controllableProvider();

    const started = await startImage(userId, provider);
    expect(started.status).toBe("running");
    expect(started.providerRequestId).toBeTruthy();
    expect(await getBalance(db(), userId)).toBe(20 - COST);

    // Still pending: a check changes nothing.
    expect((await refreshJob(db(), started, provider)).status).toBe("running");

    finish(started.providerRequestId!, {
      state: "succeeded",
      outputs: [{ kind: "image", url: "https://cdn/out.png" }],
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const done = await refreshJob(db(), started, provider);
    expect(done.status).toBe("succeeded");
    expect(done.output).toEqual([{ kind: "image", url: "https://cdn/out.png" }]);
    expect(done.outputExpiresAt).toBeInstanceOf(Date);
    expect(await getBalance(db(), userId)).toBe(20 - COST);
  });

  it("refunds a job the provider reports as failed or blocked by moderation", async () => {
    const userId = await userWithCredits();
    const { provider, finish } = controllableProvider();
    const first = await startImage(userId, provider);
    const second = await startImage(userId, provider);
    expect(await getBalance(db(), userId)).toBe(20 - 2 * COST);

    finish(first.providerRequestId!, { state: "failed", reason: "failed", error: "Generation failed" });
    finish(second.providerRequestId!, { state: "failed", reason: "nsfw", error: "Blocked by the safety filter." });
    expect((await refreshJob(db(), first, provider)).status).toBe("failed");
    const blocked = await refreshJob(db(), second, provider);
    expect(blocked.error).toBe("Blocked by the safety filter.");
    expect(await getBalance(db(), userId)).toBe(20);
  });

  it("refunds at once when the provider refuses to start the job", async () => {
    const userId = await userWithCredits();
    const { provider } = controllableProvider({
      submitError: new MediaProviderError("403 balance", "The image and video service is temporarily unavailable.", { status: 403 }),
    });
    const started = await startImage(userId, provider);
    expect(started.status).toBe("failed");
    expect(started.error).toBe("The image and video service is temporarily unavailable.");
    expect(await getBalance(db(), userId)).toBe(20);
  });

  it("settles once when a webhook and a status check race each other", async () => {
    const userId = await userWithCredits();
    const { provider, finish } = controllableProvider();
    const started = await startImage(userId, provider);
    finish(started.providerRequestId!, { state: "failed", reason: "failed", error: "boom" });

    const results = await Promise.all([
      settleJob(db(), started.id, { status: "failed", error: "boom" }),
      settleJob(db(), started.id, { status: "failed", error: "boom" }),
      refreshJob(db(), started, provider),
      settleJob(db(), started.id, { status: "succeeded" }),
    ]);
    const applied = results.slice(0, 2).filter((r) => "applied" in r && r.applied).length;
    expect(applied).toBeLessThanOrEqual(1);
    const [row] = await db().select().from(job).where(eq(job.id, started.id));
    expect(row.status).toBe("failed");
    // Refunded exactly once: back to the starting balance, not above it.
    expect(await getBalance(db(), userId)).toBe(20);
  });

  it("refuses jobs the user can't afford, and limits how many run at once", async () => {
    const poor = await userWithCredits(COST - 1);
    const { provider } = controllableProvider();
    await expect(startImage(poor, provider)).rejects.toBeInstanceOf(InsufficientCreditsError);

    const busy = await userWithCredits(100);
    for (let i = 0; i < siteConfig.jobs.maxActivePerUser; i++) await startImage(busy, provider);
    await expect(startImage(busy, provider)).rejects.toBeInstanceOf(TooManyActiveJobsError);
    expect(await getBalance(db(), busy)).toBe(100 - siteConfig.jobs.maxActivePerUser * COST);
  });

  it("checks a job at most once per interval when asked repeatedly", async () => {
    const userId = await userWithCredits();
    const { provider, statusCalls } = controllableProvider();
    const started = await startImage(userId, provider);
    const before = statusCalls();
    await Promise.all([1, 2, 3].map(() => refreshJob(db(), started, provider, { minIntervalMs: 10_000 })));
    expect(statusCalls() - before).toBe(1);
  });

  it("cron finishes jobs whose webhook never came, and refunds jobs past the timeout", async () => {
    const userId = await userWithCredits(30);
    const { provider, finish } = controllableProvider();
    const finished = await startImage(userId, provider);
    const stuck = await startImage(userId, provider);
    finish(finished.providerRequestId!, { state: "succeeded", outputs: [{ kind: "image", url: "https://cdn/a.png" }] });
    // Make the stuck job older than the timeout.
    const old = new Date(Date.now() - (siteConfig.jobs.timeoutMinutes + 5) * 60_000);
    await db().update(job).set({ createdAt: old }).where(eq(job.id, stuck.id));

    await pollActiveJobs(db(), provider, { limit: 200 });

    const rows = await db().select().from(job).where(eq(job.userId, userId));
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(finished.id)?.status).toBe("succeeded");
    expect(byId.get(stuck.id)?.status).toBe("failed");
    expect(byId.get(stuck.id)?.error).toMatch(/too long/);
    expect(await getBalance(db(), userId)).toBe(30 - COST);
  });

  it("charges a chat message when it finishes and refunds it when it errors", async () => {
    const userId = await userWithCredits(10);
    const base = { userId, toolId: "chat", provider: "anthropic", credits: 1, input: { prompt: "hi" } };
    const ok = await startChatJob(db(), base);
    const broken = await startChatJob(db(), base);
    expect(await getBalance(db(), userId)).toBe(8);
    await settleJob(db(), ok.id, { status: "succeeded" });
    await settleJob(db(), broken.id, { status: "failed", error: "The AI couldn't reply." });
    expect(await getBalance(db(), userId)).toBe(9);
  });
});
