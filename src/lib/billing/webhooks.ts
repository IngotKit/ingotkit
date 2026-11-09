// Turns a verified provider webhook into ledger rows. Records the event and grants credits
// in one transaction; the unique (provider, event_id) and the ledger's idempotency key make
// replays and retries harmless.
import type { Db } from "@/db/client";
import { isDuplicateKeyError } from "@/db/errors";
import { billingCustomer, webhookEvent } from "@/db/schema";
import { grant } from "@/lib/credits";

import { getItem } from "./catalog";
import type { ProviderName, VerifiedWebhook } from "./types";

export type WebhookOutcome = { duplicate: boolean; outcome: string; creditsGranted: number };

function describe(event: VerifiedWebhook): { outcome: string; credits: number } {
  if (!event.credit) return { outcome: `ignored: ${event.ignored ?? "nothing to do"}`, credits: 0 };
  const item = getItem(event.credit.itemId);
  if (!item) return { outcome: `ignored: unknown item "${event.credit.itemId}" (not in site.config.ts)`, credits: 0 };
  return { outcome: `granted ${item.credits} credits for ${item.id}`, credits: item.credits };
}

export async function applyWebhook(db: Db, provider: ProviderName, event: VerifiedWebhook): Promise<WebhookOutcome> {
  const { outcome, credits } = describe(event);

  try {
    return await db.transaction(async (tx) => {
      // Throws on a replayed event id, which rolls back and is reported as a duplicate.
      await tx.insert(webhookEvent).values({ provider, eventId: event.eventId, eventType: event.eventType, outcome });

      if (event.customer) {
        await tx
          .insert(billingCustomer)
          .values({ userId: event.customer.userId, provider, customerId: event.customer.customerId })
          .onDuplicateKeyUpdate({ set: { customerId: event.customer.customerId } });
      }

      let creditsGranted = 0;
      if (event.credit && credits > 0) {
        const { applied } = await grant(tx, {
          userId: event.credit.userId,
          amount: credits,
          kind: event.credit.kind,
          // Same payment seen through a different event id still grants once.
          idempotencyKey: event.credit.reference,
          reference: event.credit.reference,
        });
        if (applied) creditsGranted = credits;
      }
      return { duplicate: false, outcome, creditsGranted };
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return { duplicate: true, outcome: "duplicate event", creditsGranted: 0 };
    throw error;
  }
}
