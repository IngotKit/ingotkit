import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { billingCustomer, webhookEvent } from "@/db/schema";
import type { VerifiedWebhook } from "@/lib/billing/types";
import { applyWebhook } from "@/lib/billing/webhooks";
import { getBalance } from "@/lib/credits";

import { createTestUser, deleteTestUsers, hasDatabase } from "./helpers";

describe.skipIf(!hasDatabase)("applying payment webhooks (MySQL)", () => {
  const db = () => getDb();
  const pack = siteConfig.creditPacks[0];
  const plan = siteConfig.plans[0];
  const eventIds: string[] = [];

  afterAll(async () => {
    for (const eventId of eventIds) await db().delete(webhookEvent).where(eq(webhookEvent.eventId, eventId));
    await deleteTestUsers();
  });

  function purchase(userId: string, overrides: Partial<VerifiedWebhook> = {}): VerifiedWebhook {
    const eventId = `evt_${crypto.randomUUID()}`;
    eventIds.push(eventId);
    return {
      eventId,
      eventType: "order.paid",
      credit: { userId, itemId: pack.id, kind: "purchase", reference: `polar:order:${crypto.randomUUID()}` },
      customer: { userId, customerId: `cus_${userId.slice(0, 8)}` },
      ...overrides,
    };
  }

  it("grants the pack's credits once, and a replayed event grants nothing", async () => {
    const userId = await createTestUser("webhook");
    const event = purchase(userId);

    const first = await applyWebhook(db(), "polar", event);
    expect(first).toMatchObject({ duplicate: false, creditsGranted: pack.credits });
    expect(await getBalance(db(), userId)).toBe(pack.credits);

    const replay = await applyWebhook(db(), "polar", event);
    expect(replay).toMatchObject({ duplicate: true, creditsGranted: 0 });
    expect(await getBalance(db(), userId)).toBe(pack.credits);
  });

  it("grants once when the same payment arrives under a different event id", async () => {
    const userId = await createTestUser("webhook");
    const first = purchase(userId);
    const second = purchase(userId, { credit: first.credit });

    await applyWebhook(db(), "polar", first);
    const again = await applyWebhook(db(), "polar", second);
    expect(again).toMatchObject({ duplicate: false, creditsGranted: 0 });
    expect(await getBalance(db(), userId)).toBe(pack.credits);
  });

  it("each subscription renewal adds the plan's monthly credits", async () => {
    const userId = await createTestUser("webhook");
    for (let month = 0; month < 2; month++) {
      await applyWebhook(
        db(),
        "polar",
        purchase(userId, {
          credit: { userId, itemId: plan.id, kind: "subscription", reference: `polar:order:${crypto.randomUUID()}` },
        }),
      );
    }
    expect(await getBalance(db(), userId)).toBe(plan.monthlyCredits * 2);
  });

  it("records ignored events and unknown items without granting", async () => {
    const userId = await createTestUser("webhook");
    const ignored = await applyWebhook(db(), "polar", {
      eventId: (eventIds.push(`evt_${crypto.randomUUID()}`), eventIds.at(-1)!),
      eventType: "subscription.canceled",
      ignored: "not a payment event",
    });
    expect(ignored).toMatchObject({ duplicate: false, creditsGranted: 0, outcome: "ignored: not a payment event" });

    const unknown = await applyWebhook(
      db(),
      "polar",
      purchase(userId, { credit: { userId, itemId: "no-such-pack", kind: "purchase", reference: `x:${userId}` } }),
    );
    expect(unknown.outcome).toMatch(/unknown item/);
    expect(await getBalance(db(), userId)).toBe(0);
  });

  it("remembers the provider's customer id for the portal", async () => {
    const userId = await createTestUser("webhook");
    await applyWebhook(db(), "stripe", purchase(userId, { customer: { userId, customerId: "cus_first" } }));
    await applyWebhook(db(), "stripe", purchase(userId, { customer: { userId, customerId: "cus_second" } }));
    const [row] = await db()
      .select()
      .from(billingCustomer)
      .where(and(eq(billingCustomer.userId, userId), eq(billingCustomer.provider, "stripe")));
    expect(row?.customerId).toBe("cus_second");
  });
});
