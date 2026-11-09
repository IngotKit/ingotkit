import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db/client";
import {
  InsufficientCreditsError,
  ReservationNotFoundError,
  commit,
  getBalance,
  grant,
  refund,
  reserve,
} from "@/lib/credits";

import { createTestUser, deleteTestUsers, hasDatabase } from "./helpers";

describe.skipIf(!hasDatabase)("credits ledger (MySQL)", () => {
  const db = () => getDb();
  afterAll(deleteTestUsers);

  async function userWith(credits: number) {
    const userId = await createTestUser("ledger");
    if (credits > 0) await grant(db(), { userId, amount: credits, kind: "purchase", idempotencyKey: `test:${userId}` });
    return userId;
  }

  it("starts at zero and grants add up", async () => {
    const userId = await userWith(0);
    expect(await getBalance(db(), userId)).toBe(0);
    await grant(db(), { userId, amount: 20, kind: "signup", idempotencyKey: `signup:${userId}` });
    await grant(db(), { userId, amount: 100, kind: "purchase", idempotencyKey: `order:a:${userId}` });
    expect(await getBalance(db(), userId)).toBe(120);
  });

  it("ignores a repeated grant with the same key", async () => {
    const userId = await userWith(0);
    const key = `polar:order:${crypto.randomUUID()}`;
    expect(await grant(db(), { userId, amount: 50, kind: "purchase", idempotencyKey: key })).toEqual({ applied: true });
    expect(await grant(db(), { userId, amount: 50, kind: "purchase", idempotencyKey: key })).toEqual({ applied: false });
    expect(await getBalance(db(), userId)).toBe(50);
  });

  it("rejects negative grants except admin adjustments", async () => {
    const userId = await userWith(10);
    await expect(grant(db(), { userId, amount: -5, kind: "purchase", idempotencyKey: `x:${userId}` })).rejects.toThrow();
    await grant(db(), { userId, amount: -5, kind: "adjustment", idempotencyKey: `adj:${userId}` });
    expect(await getBalance(db(), userId)).toBe(5);
  });

  it("reserve holds credits; commit with a lower actual cost returns the difference", async () => {
    const userId = await userWith(100);
    const jobId = crypto.randomUUID();
    await reserve(db(), { userId, jobId, amount: 30 });
    expect(await getBalance(db(), userId)).toBe(70);
    await commit(db(), { jobId, actualAmount: 25 });
    expect(await getBalance(db(), userId)).toBe(75);
  });

  it("refund returns the whole reservation; a job settles only once", async () => {
    const userId = await userWith(100);
    const jobId = crypto.randomUUID();
    await reserve(db(), { userId, jobId, amount: 40 });
    expect(await refund(db(), { jobId })).toEqual({ applied: true });
    expect(await getBalance(db(), userId)).toBe(100);
    // Already settled: neither a second refund nor a late commit changes anything.
    expect(await refund(db(), { jobId })).toEqual({ applied: false });
    expect(await commit(db(), { jobId })).toEqual({ applied: false });
    expect(await getBalance(db(), userId)).toBe(100);
  });

  it("reserving the same job twice holds credits once", async () => {
    const userId = await userWith(50);
    const jobId = crypto.randomUUID();
    expect(await reserve(db(), { userId, jobId, amount: 20 })).toEqual({ applied: true });
    expect(await reserve(db(), { userId, jobId, amount: 20 })).toEqual({ applied: false });
    expect(await getBalance(db(), userId)).toBe(30);
  });

  it("refuses to reserve more than the balance", async () => {
    const userId = await userWith(10);
    await expect(reserve(db(), { userId, jobId: crypto.randomUUID(), amount: 11 })).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
    expect(await getBalance(db(), userId)).toBe(10);
  });

  it("settling an unknown job fails clearly", async () => {
    await expect(refund(db(), { jobId: crypto.randomUUID() })).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it("20 concurrent reserves never overspend", async () => {
    const userId = await userWith(100);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => reserve(db(), { userId, jobId: crypto.randomUUID(), amount: 10 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const refused = results.filter(
      (r) => r.status === "rejected" && r.reason instanceof InsufficientCreditsError,
    ).length;
    expect(ok).toBe(10);
    expect(refused).toBe(10);
    expect(await getBalance(db(), userId)).toBe(0);
  });
});
