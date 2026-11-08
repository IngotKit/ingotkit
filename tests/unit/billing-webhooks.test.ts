import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { createPolarProvider } from "@/lib/billing/polar";
import { createStripeProvider } from "@/lib/billing/stripe";
import { WebhookSignatureError } from "@/lib/billing/types";

import { TEST_POLAR_WEBHOOK_SECRET, orderPaidEvent, signedPolarRequest } from "../helpers/polar-webhooks";

// parseWebhook only verifies and reads; it never calls the provider's API.
const polar = createPolarProvider({ accessToken: "polar_test", webhookSecret: TEST_POLAR_WEBHOOK_SECRET, server: "sandbox" });

async function parsePolar(payload: unknown, secret?: string) {
  const req = signedPolarRequest(payload, secret);
  return polar.parseWebhook(req.body, new Headers(req.headers));
}

describe("Polar webhooks", () => {
  it("turns a paid one-time order into a purchase credit", async () => {
    const event = await parsePolar(orderPaidEvent({ orderId: "ord_1", userId: "user_1", itemId: "starter" }));
    expect(event.eventType).toBe("order.paid");
    expect(event.credit).toEqual({ userId: "user_1", itemId: "starter", kind: "purchase", reference: "polar:order:ord_1" });
  });

  it("turns subscription start and renewal orders into subscription credits", async () => {
    for (const billingReason of ["subscription_create", "subscription_cycle"] as const) {
      const event = await parsePolar(orderPaidEvent({ userId: "u", itemId: "pro-monthly", billingReason }));
      expect(event.credit?.kind).toBe("subscription");
    }
  });

  it("grants nothing for plan changes, other event types, or orders without our user", async () => {
    expect((await parsePolar(orderPaidEvent({ userId: "u", itemId: "pro-monthly", billingReason: "subscription_update" }))).credit).toBeUndefined();
    expect((await parsePolar({ type: "subscription.canceled", data: {} })).ignored).toBe("not a payment event");
    expect((await parsePolar(orderPaidEvent({ userId: null, itemId: "starter" }))).ignored).toMatch(/no IngotKit user/);
    expect((await parsePolar({ type: "something.new", data: {} })).ignored).toBe("unknown event type");
  });

  it("rejects a forged signature", async () => {
    const forged = `whsec_${Buffer.from("not-the-real-secret").toString("base64")}`;
    await expect(parsePolar(orderPaidEvent({ userId: "u", itemId: "starter" }), forged)).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
  });

  it("rejects a tampered body", async () => {
    const req = signedPolarRequest(orderPaidEvent({ userId: "u", itemId: "starter" }));
    const tampered = req.body.replace("starter", "studio");
    await expect(polar.parseWebhook(tampered, new Headers(req.headers))).rejects.toBeInstanceOf(WebhookSignatureError);
  });
});

describe("Stripe webhooks", () => {
  const secret = "whsec_test_stripe_secret";
  const stripe = createStripeProvider({ secretKey: "sk_test_x", webhookSecret: secret, findCustomerId: async () => undefined });
  const signer = new Stripe("sk_test_x");

  async function parseStripe(event: object, signWith = secret) {
    const body = JSON.stringify(event);
    const header = await signer.webhooks.generateTestHeaderStringAsync({ payload: body, secret: signWith });
    return stripe.parseWebhook(body, new Headers({ "stripe-signature": header }));
  }

  it("credits a paid one-time checkout and remembers the customer", async () => {
    const event = await parseStripe({
      id: "evt_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          client_reference_id: "user_1",
          customer: "cus_1",
          metadata: { ingotkit_user: "user_1", ingotkit_item: "creator" },
        },
      },
    });
    expect(event.credit).toEqual({ userId: "user_1", itemId: "creator", kind: "purchase", reference: "stripe:checkout:cs_1" });
    expect(event.customer).toEqual({ userId: "user_1", customerId: "cus_1" });
  });

  it("credits subscription invoices from the subscription's metadata", async () => {
    const event = await parseStripe({
      id: "evt_2",
      object: "event",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          object: "invoice",
          billing_reason: "subscription_cycle",
          customer: "cus_1",
          parent: { subscription_details: { metadata: { ingotkit_user: "user_1", ingotkit_item: "pro-monthly" } } },
        },
      },
    });
    expect(event.credit).toEqual({ userId: "user_1", itemId: "pro-monthly", kind: "subscription", reference: "stripe:invoice:in_1" });
  });

  it("rejects a forged signature", async () => {
    await expect(parseStripe({ id: "evt_3", object: "event", type: "invoice.paid", data: { object: {} } }, "whsec_wrong")).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
  });
});
