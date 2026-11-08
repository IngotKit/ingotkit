// Stripe. The only file that imports the Stripe SDK. Prices are found by lookup key
// ("ingotkit_<item id>"), which `npm run billing:sync` sets.
import Stripe from "stripe";

import type { BillingItem } from "./catalog";
import {
  NoBillingCustomerError,
  ProductNotSyncedError,
  WebhookSignatureError,
  type BillingProvider,
  type SyncResult,
  type VerifiedWebhook,
} from "./types";

const ITEM_METADATA_KEY = "ingotkit_item";
const USER_METADATA_KEY = "ingotkit_user";
const lookupKey = (itemId: string) => `ingotkit_${itemId}`;

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  /** Returns the saved Stripe customer id for a user, if any (from billing_customer). */
  findCustomerId: (userId: string) => Promise<string | undefined>;
};

export function createStripeProvider(config: StripeConfig): BillingProvider {
  let client: Stripe | undefined;
  const stripe = () => (client ??= new Stripe(config.secretKey));

  async function findPrice(itemId: string) {
    const prices = await stripe().prices.list({ lookup_keys: [lookupKey(itemId)], active: true, limit: 1 });
    return prices.data[0];
  }

  return {
    name: "stripe",

    async createCheckout({ item, user, successUrl, cancelUrl }) {
      const price = await findPrice(item.id);
      if (!price) throw new ProductNotSyncedError(item.id);
      const metadata = { [USER_METADATA_KEY]: user.id, [ITEM_METADATA_KEY]: item.id };
      const customer = await config.findCustomerId(user.id);
      const session = await stripe().checkout.sessions.create({
        mode: item.interval ? "subscription" : "payment",
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.id,
        ...(customer ? { customer } : { customer_email: user.email }),
        ...(item.interval
          ? { subscription_data: { metadata } }
          : { customer_creation: customer ? undefined : ("always" as const) }),
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      if (!session.url) throw new Error("Stripe returned a checkout session without a URL");
      return { url: session.url };
    },

    async createPortalUrl({ userId, returnUrl }) {
      const customer = await config.findCustomerId(userId);
      if (!customer) throw new NoBillingCustomerError();
      const session = await stripe().billingPortal.sessions.create({ customer, return_url: returnUrl });
      return session.url;
    },

    async parseWebhook(rawBody, headers): Promise<VerifiedWebhook> {
      let event: Stripe.Event;
      try {
        event = await stripe().webhooks.constructEventAsync(
          rawBody,
          headers.get("stripe-signature") ?? "",
          config.webhookSecret,
        );
      } catch (error) {
        throw new WebhookSignatureError((error as Error).message);
      }
      const base = { eventId: event.id, eventType: event.type };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.[USER_METADATA_KEY];
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const customer = userId && customerId ? { userId, customerId } : undefined;
        // Subscriptions are credited on invoice.paid (first and every renewal).
        if (session.mode !== "payment") return { ...base, customer, ignored: "subscription credited on invoice.paid" };
        if (session.payment_status !== "paid") return { ...base, customer, ignored: "payment not completed" };
        const itemId = session.metadata?.[ITEM_METADATA_KEY];
        if (!userId || !itemId) return { ...base, ignored: "session has no IngotKit user or item" };
        return {
          ...base,
          customer,
          credit: { userId, itemId, kind: "purchase", reference: `stripe:checkout:${session.id}` },
        };
      }

      if (event.type === "invoice.paid") {
        const invoice = event.data.object;
        if (invoice.billing_reason !== "subscription_create" && invoice.billing_reason !== "subscription_cycle") {
          return { ...base, ignored: `billing reason "${invoice.billing_reason}" grants no credits` };
        }
        const metadata = invoice.parent?.subscription_details?.metadata ?? {};
        const userId = metadata[USER_METADATA_KEY];
        const itemId = metadata[ITEM_METADATA_KEY];
        if (!userId || !itemId) return { ...base, ignored: "subscription has no IngotKit user or item" };
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        return {
          ...base,
          customer: customerId ? { userId, customerId } : undefined,
          credit: { userId, itemId, kind: "subscription", reference: `stripe:invoice:${invoice.id}` },
        };
      }

      return { ...base, ignored: "not a payment event" };
    },

    async syncProducts(items: BillingItem[]): Promise<SyncResult[]> {
      const results: SyncResult[] = [];
      for (const item of items) {
        const existing = await findPrice(item.id);
        const recurring = item.interval ? { recurring: { interval: item.interval } } : {};
        if (existing && existing.unit_amount === item.priceCents && existing.currency === item.currency) {
          results.push({ itemId: item.id, status: "unchanged", externalId: existing.id });
          continue;
        }
        const productId =
          typeof existing?.product === "string"
            ? existing.product
            : (
                await stripe().products.create({
                  name: item.name,
                  description: item.description,
                  metadata: { [ITEM_METADATA_KEY]: item.id },
                })
              ).id;
        // Prices are immutable in Stripe: a new price takes over the lookup key.
        const price = await stripe().prices.create({
          product: productId,
          unit_amount: item.priceCents,
          currency: item.currency,
          lookup_key: lookupKey(item.id),
          transfer_lookup_key: true,
          ...recurring,
        });
        if (existing) await stripe().prices.update(existing.id, { active: false });
        results.push({ itemId: item.id, status: existing ? "updated" : "created", externalId: price.id });
      }
      return results;
    },
  };
}
