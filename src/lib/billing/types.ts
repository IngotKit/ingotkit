import type { BillingItem } from "./catalog";

export type ProviderName = "polar" | "stripe";

export type CheckoutInput = {
  item: BillingItem;
  user: { id: string; email: string; name?: string | null };
  successUrl: string;
  cancelUrl: string;
};

/** What a verified webhook means for us, independent of the provider. */
export type VerifiedWebhook = {
  eventId: string;
  eventType: string;
  /** Credits to grant, if this event is a completed payment we recognise. */
  credit?: {
    userId: string;
    itemId: string;
    kind: "purchase" | "subscription";
    /** Unique per payment, e.g. "polar:order:<id>". Becomes the ledger idempotency key. */
    reference: string;
  };
  /** Link between our user and the provider's customer (Stripe needs it for the portal). */
  customer?: { userId: string; customerId: string };
  /** Why nothing was done, for the webhook log. */
  ignored?: string;
};

export type SyncResult = { itemId: string; status: "created" | "updated" | "unchanged"; externalId: string };

export interface BillingProvider {
  readonly name: ProviderName;
  /** A hosted checkout URL to send the user to. */
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  /** A hosted page where the customer manages payment methods, invoices and subscriptions. */
  createPortalUrl(input: { userId: string; returnUrl: string }): Promise<string>;
  /** Verifies the signature and translates the event. Throws WebhookSignatureError if forged. */
  parseWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook>;
  /** Creates or updates provider products so they match site.config.ts. */
  syncProducts(items: BillingItem[]): Promise<SyncResult[]>;
}

export class WebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("No payment provider is configured. Add Polar or Stripe keys (see /setup).");
    this.name = "BillingNotConfiguredError";
  }
}

export class ProductNotSyncedError extends Error {
  constructor(itemId: string) {
    super(`No provider product for "${itemId}". Run \`npm run billing:sync\`.`);
    this.name = "ProductNotSyncedError";
  }
}

export class NoBillingCustomerError extends Error {
  constructor() {
    super("No billing account yet. Make a purchase first.");
    this.name = "NoBillingCustomerError";
  }
}
