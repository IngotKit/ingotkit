import { describe, expect, it } from "vitest";

import { signStandardWebhook, StandardWebhookError, verifyStandardWebhook } from "@/lib/webhooks/standard";

const SECRET = `whsec_${Buffer.from("test-secret-for-standard-webhooks").toString("base64")}`;
const BODY = JSON.stringify({ request_id: "req_1", status: "completed" });

function headersFor(body: string, { secret = SECRET, at = Math.floor(Date.now() / 1000), id = "msg_1" } = {}) {
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(at),
    "webhook-signature": signStandardWebhook(secret, id, at, body),
  });
}

describe("Standard Webhooks verification", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyStandardWebhook(SECRET, BODY, headersFor(BODY))).toEqual({ id: "msg_1" });
  });

  it("accepts any matching entry when several signatures are sent (secret rotation)", () => {
    const headers = headersFor(BODY);
    headers.set("webhook-signature", `v1,bm90LXRoZS1yaWdodC1vbmU= ${headers.get("webhook-signature")}`);
    expect(() => verifyStandardWebhook(SECRET, BODY, headers)).not.toThrow();
  });

  it("rejects a tampered body, a wrong secret, missing headers and old timestamps", () => {
    expect(() => verifyStandardWebhook(SECRET, BODY.replace("completed", "failed"), headersFor(BODY))).toThrow(StandardWebhookError);
    const other = `whsec_${Buffer.from("another-secret").toString("base64")}`;
    expect(() => verifyStandardWebhook(SECRET, BODY, headersFor(BODY, { secret: other }))).toThrow(StandardWebhookError);
    expect(() => verifyStandardWebhook(SECRET, BODY, new Headers())).toThrow(StandardWebhookError);
    const old = Math.floor(Date.now() / 1000) - 10 * 60;
    expect(() => verifyStandardWebhook(SECRET, BODY, headersFor(BODY, { at: old }))).toThrow(/too old/);
  });
});
