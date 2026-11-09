// Verifies webhooks signed with the Standard Webhooks scheme (https://standardwebhooks.com):
// HMAC-SHA256 over "{webhook-id}.{webhook-timestamp}.{raw body}", keyed with the base64 part
// of a "whsec_..." secret. Higgsfield signs this way. Small enough to keep dependency-free.
import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export class StandardWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StandardWebhookError";
  }
}

function keyFromSecret(secret: string): Buffer {
  return Buffer.from(secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret, "base64");
}

export function signStandardWebhook(secret: string, id: string, timestamp: number, body: string): string {
  const mac = createHmac("sha256", keyFromSecret(secret)).update(`${id}.${timestamp}.${body}`).digest("base64");
  return `v1,${mac}`;
}

/** Throws StandardWebhookError unless the headers carry a valid, recent signature for `body`. */
export function verifyStandardWebhook(
  secret: string,
  body: string,
  headers: Headers,
  now: number = Date.now(),
): { id: string } {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) throw new StandardWebhookError("Missing webhook signature headers");

  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(now / 1000 - sentAt) > TOLERANCE_SECONDS) {
    throw new StandardWebhookError("Webhook timestamp is too old or invalid");
  }

  const expected = Buffer.from(signStandardWebhook(secret, id, sentAt, body).slice(3), "base64");
  const valid = signatures.split(" ").some((entry) => {
    const [version, value] = entry.split(",", 2);
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) throw new StandardWebhookError("No matching webhook signature");
  return { id };
}
