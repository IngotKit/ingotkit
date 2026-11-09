// The only module that changes credits. Append-only: every change is a new row in
// credit_ledger, and a balance is the SUM of a user's rows.
//
// Job lifecycle: reserve (hold credits before calling a provider) → commit (job done; any
// unused part comes back) or refund (job failed; everything comes back). Commit and refund
// share one idempotency key per job ("settle:<jobId>"), so a job settles exactly once.
import { and, eq, sql } from "drizzle-orm";

import type { Db, DbOrTx } from "@/db/client";
import { isDuplicateKeyError } from "@/db/errors";
import { creditLedger, type CreditKind } from "@/db/schema";

export class InsufficientCreditsError extends Error {
  constructor(
    readonly balance: number,
    readonly needed: number,
  ) {
    super(`Not enough credits: balance ${balance}, needed ${needed}.`);
    this.name = "InsufficientCreditsError";
  }
}

export class ReservationNotFoundError extends Error {
  constructor(readonly jobId: string) {
    super(`No credit reservation for job ${jobId}.`);
    this.name = "ReservationNotFoundError";
  }
}

const keys = {
  reserve: (jobId: string) => `reserve:${jobId}`,
  settle: (jobId: string) => `settle:${jobId}`,
};

type Entry = {
  userId: string;
  amount: number;
  kind: CreditKind;
  idempotencyKey: string;
  jobId?: string;
  reference?: string;
  note?: string;
};

/** Inserts a row unless its idempotency key exists. Returns true if this call added it. */
async function append(db: DbOrTx, entry: Entry): Promise<boolean> {
  try {
    await db.insert(creditLedger).values(entry);
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

async function sumFor(db: DbOrTx, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`sum(${creditLedger.amount})` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return Number(row?.total ?? 0);
}

export async function getBalance(db: DbOrTx, userId: string): Promise<number> {
  return sumFor(db, userId);
}

export type GrantInput = {
  userId: string;
  amount: number;
  kind: Extract<CreditKind, "signup" | "purchase" | "subscription" | "adjustment">;
  /** Unique per real-world event, e.g. "polar:order:<id>" or "signup:<userId>". */
  idempotencyKey: string;
  reference?: string;
  note?: string;
};

/** Adds (or, for admin adjustments, removes) credits. Returns false if the key was already used. */
export async function grant(db: DbOrTx, input: GrantInput): Promise<{ applied: boolean }> {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new Error("amount must be a non-zero integer");
  if (input.amount < 0 && input.kind !== "adjustment") throw new Error("only adjustments can be negative");
  return { applied: await append(db, input) };
}

/**
 * Holds `amount` credits for a job. Locks the user's row while it checks the balance, so
 * concurrent reservations can't overspend. Calling it again for the same job is a no-op.
 */
export async function reserve(
  db: Db,
  input: { userId: string; jobId: string; amount: number },
): Promise<{ applied: boolean }> {
  const { userId, jobId, amount } = input;
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount must be a positive integer");

  return db.transaction(async (tx) => {
    // Serialise this user's reservations. The user row is the lock; no balance is stored.
    await tx.execute(sql`select id from \`user\` where id = ${userId} for update`);

    const [existing] = await tx
      .select({ amount: creditLedger.amount })
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, keys.reserve(jobId)));
    if (existing) {
      if (-existing.amount !== amount) throw new Error(`job ${jobId} is already reserved for ${-existing.amount} credits`);
      return { applied: false };
    }

    const balance = await sumFor(tx, userId);
    if (balance < amount) throw new InsufficientCreditsError(balance, amount);

    await append(tx, { userId, amount: -amount, kind: "reserve", idempotencyKey: keys.reserve(jobId), jobId });
    return { applied: true };
  });
}

async function findReservation(db: Db, jobId: string) {
  const [row] = await db
    .select({ userId: creditLedger.userId, amount: creditLedger.amount })
    .from(creditLedger)
    .where(and(eq(creditLedger.idempotencyKey, keys.reserve(jobId)), eq(creditLedger.kind, "reserve")));
  if (!row) throw new ReservationNotFoundError(jobId);
  return { userId: row.userId, reserved: -row.amount };
}

/**
 * Finalises a successful job. If it cost less than reserved (`actualAmount`), the difference
 * goes back to the user. Returns false if the job was already committed or refunded.
 */
export async function commit(db: Db, input: { jobId: string; actualAmount?: number }): Promise<{ applied: boolean }> {
  const { userId, reserved } = await findReservation(db, input.jobId);
  const actual = Math.min(Math.max(input.actualAmount ?? reserved, 0), reserved);
  const applied = await append(db, {
    userId,
    amount: reserved - actual,
    kind: "commit",
    idempotencyKey: keys.settle(input.jobId),
    jobId: input.jobId,
  });
  return { applied };
}

/** Returns a failed job's whole reservation. Returns false if the job was already settled. */
export async function refund(db: Db, input: { jobId: string; note?: string }): Promise<{ applied: boolean }> {
  const { userId, reserved } = await findReservation(db, input.jobId);
  const applied = await append(db, {
    userId,
    amount: reserved,
    kind: "refund",
    idempotencyKey: keys.settle(input.jobId),
    jobId: input.jobId,
    note: input.note,
  });
  return { applied };
}
