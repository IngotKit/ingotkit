// Builds Polar webhook requests signed the way Polar signs them (Standard Webhooks), so tests
// go through the real signature check instead of bypassing it.
import { Webhook } from "standardwebhooks";

/** A test-only signing secret in Polar's format. */
export const TEST_POLAR_WEBHOOK_SECRET = `whsec_${Buffer.from("ingotkit-e2e-polar-secret-0001").toString("base64")}`;

export function signedPolarRequest(payload: unknown, secret = TEST_POLAR_WEBHOOK_SECRET, eventId = crypto.randomUUID()) {
  const body = JSON.stringify(payload);
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(eventId, timestamp, body);
  return {
    body,
    eventId,
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "webhook-signature": signature,
    },
  };
}

type OrderOptions = {
  orderId?: string;
  userId: string | null;
  itemId: string;
  billingReason?: "purchase" | "subscription_create" | "subscription_cycle" | "subscription_update";
};

/** The parts of Polar's order.paid payload that IngotKit reads (Polar sends many more). */
export function orderPaidEvent({ orderId = crypto.randomUUID(), userId, itemId, billingReason = "purchase" }: OrderOptions) {
  return {
    type: "order.paid",
    timestamp: new Date().toISOString(),
    data: {
      id: orderId,
      billing_reason: billingReason,
      metadata: {},
      customer: { id: `cus_${orderId.slice(0, 8)}`, external_id: userId },
      product: { metadata: { ingotkit_item: itemId } },
    },
  };
}
