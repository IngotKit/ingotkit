// Polar (merchant of record). The only file that imports the Polar SDK.
import { createPolar, webhooks, type Polar } from "@polar-sh/sdk/2026-10";
import { z } from "zod";

import type { BillingItem } from "./catalog";
import {
  NoBillingCustomerError,
  ProductNotSyncedError,
  WebhookSignatureError,
  type BillingProvider,
  type SyncResult,
  type VerifiedWebhook,
} from "./types";

/** Metadata key that ties a Polar product to an item id in site.config.ts. */
export const ITEM_METADATA_KEY = "ingotkit_item";
const USER_METADATA_KEY = "ingotkit_user";

export type PolarConfig = {
  accessToken: string;
  webhookSecret: string;
  server: "sandbox" | "production";
};

// Only the fields we use; Polar sends many more, and new ones must not break us.
const orderPaidSchema = z.object({
  type: z.literal("order.paid"),
  data: z.object({
    id: z.string(),
    billing_reason: z.string(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    customer: z.object({ id: z.string(), external_id: z.string().nullish() }),
    product: z.object({ metadata: z.record(z.string(), z.unknown()).nullish() }).nullish(),
  }),
});

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createPolarProvider(config: PolarConfig): BillingProvider {
  let client: Polar | undefined;
  const polar = () => (client ??= createPolar({ accessToken: config.accessToken, environment: config.server }));
  const productIds = new Map<string, string>();

  async function findProduct(itemId: string) {
    const page = await polar().products.list({
      metadata: { [ITEM_METADATA_KEY]: itemId },
      is_archived: false,
      limit: 1,
    });
    return page.items[0];
  }

  async function productIdFor(itemId: string): Promise<string> {
    const cached = productIds.get(itemId);
    if (cached) return cached;
    const product = await findProduct(itemId);
    if (!product) throw new ProductNotSyncedError(itemId);
    productIds.set(itemId, product.id);
    return product.id;
  }

  function priceBody(item: BillingItem) {
    return [
      {
        amount_type: "fixed" as const,
        price_amount: item.priceCents,
        price_currency: item.currency.toLowerCase() as "usd",
      },
    ];
  }

  return {
    name: "polar",

    async createCheckout({ item, user, successUrl, cancelUrl }) {
      const checkout = await polar().checkouts.create({
        products: [await productIdFor(item.id)],
        // Links the Polar customer to our user, so webhooks and the portal know who it is.
        external_customer_id: user.id,
        customer_email: user.email,
        customer_name: user.name ?? undefined,
        success_url: successUrl,
        return_url: cancelUrl,
        metadata: { [USER_METADATA_KEY]: user.id, [ITEM_METADATA_KEY]: item.id },
      });
      return { url: checkout.url };
    },

    async createPortalUrl({ userId, returnUrl }) {
      try {
        const session = await polar().customerSessions.create({ external_customer_id: userId, return_url: returnUrl });
        return session.customer_portal_url;
      } catch (error) {
        // No Polar customer with this external id yet (never bought anything).
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 422) throw new NoBillingCustomerError();
        throw error;
      }
    },

    async parseWebhook(rawBody, headers): Promise<VerifiedWebhook> {
      const signatureHeaders = {
        "webhook-id": headers.get("webhook-id") ?? "",
        "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
        "webhook-signature": headers.get("webhook-signature") ?? "",
      };
      let event: { type: string };
      try {
        event = (await webhooks.validateEvent(rawBody, signatureHeaders, config.webhookSecret)) as { type: string };
      } catch (error) {
        if (error instanceof webhooks.PolarWebhookUnknownTypeError) {
          return { eventId: signatureHeaders["webhook-id"], eventType: "unknown", ignored: "unknown event type" };
        }
        if (error instanceof webhooks.PolarWebhookVerificationError) throw new WebhookSignatureError(error.message);
        throw new WebhookSignatureError("Invalid webhook payload");
      }

      const base = { eventId: signatureHeaders["webhook-id"], eventType: event.type };
      if (event.type !== "order.paid") return { ...base, ignored: "not a payment event" };

      const parsed = orderPaidSchema.safeParse(event);
      if (!parsed.success) return { ...base, ignored: "order.paid payload missing expected fields" };
      const order = parsed.data.data;

      const userId = str(order.customer.external_id) ?? str(order.metadata?.[USER_METADATA_KEY]);
      const itemId = str(order.product?.metadata?.[ITEM_METADATA_KEY]) ?? str(order.metadata?.[ITEM_METADATA_KEY]);
      if (!userId) return { ...base, ignored: "order has no IngotKit user (bought outside the app?)" };
      if (!itemId) return { ...base, ignored: "order's product has no ingotkit_item metadata" };

      const kind =
        order.billing_reason === "purchase"
          ? "purchase"
          : order.billing_reason === "subscription_create" || order.billing_reason === "subscription_cycle"
            ? "subscription"
            : undefined;
      if (!kind) return { ...base, ignored: `billing reason "${order.billing_reason}" grants no credits` };

      return {
        ...base,
        credit: { userId, itemId, kind, reference: `polar:order:${order.id}` },
        customer: { userId, customerId: order.customer.id },
      };
    },

    async syncProducts(items): Promise<SyncResult[]> {
      const results: SyncResult[] = [];
      for (const item of items) {
        const existing = await findProduct(item.id);
        const recurring = item.interval ? { recurring_interval: item.interval } : {};
        if (!existing) {
          const created = await polar().products.create({
            name: item.name,
            description: item.description,
            prices: priceBody(item),
            metadata: { [ITEM_METADATA_KEY]: item.id },
            ...recurring,
          } as Parameters<Polar["products"]["create"]>[0]);
          results.push({ itemId: item.id, status: "created", externalId: created.id });
          continue;
        }
        const currentAmount = existing.prices
          .map((price) => (price as { price_amount?: number }).price_amount)
          .find((amount) => typeof amount === "number");
        const changed =
          existing.name !== item.name || existing.description !== item.description || currentAmount !== item.priceCents;
        if (changed) {
          await polar().products.update(existing.id, {
            name: item.name,
            description: item.description,
            prices: priceBody(item),
          });
        }
        results.push({ itemId: item.id, status: changed ? "updated" : "unchanged", externalId: existing.id });
      }
      return results;
    },
  };
}
