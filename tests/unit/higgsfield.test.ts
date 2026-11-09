import { describe, expect, it } from "vitest";

import { createHiggsfieldProvider } from "@/lib/ai/media/higgsfield";
import { MediaProviderError, MediaWebhookSignatureError } from "@/lib/ai/media/types";
import { signStandardWebhook } from "@/lib/webhooks/standard";

type Call = { url: string; init: RequestInit };

/** A fetch that records calls and answers from a queue of responses. */
function fakeFetch(...responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200 });
  }) as typeof fetch;
  return { calls, fetchFn };
}

const WEBHOOK_SECRET = `whsec_${Buffer.from("higgsfield-test-secret").toString("base64")}`;

function provider(fetchFn: typeof fetch, webhookSecret?: string) {
  return createHiggsfieldProvider({ keyId: "kid", keySecret: "ksecret", webhookSecret, fetch: fetchFn });
}

describe("Higgsfield adapter", () => {
  it("submits to the model path with the key, idempotency key and webhook URL", async () => {
    const { calls, fetchFn } = fakeFetch({ body: { status: "queued", request_id: "req_123" } });
    const result = await provider(fetchFn).submit({
      model: "z-image/turbo",
      params: { prompt: "a cat" },
      webhookUrl: "https://app.example.com/api/webhooks/higgsfield",
      idempotencyKey: "job-1",
    });

    expect(result).toEqual({ requestId: "req_123" });
    expect(calls[0].url).toBe(
      "https://api.higgsfield.ai/z-image/turbo?hf_webhook=https%3A%2F%2Fapp.example.com%2Fapi%2Fwebhooks%2Fhiggsfield",
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Key kid:ksecret");
    expect(headers["Idempotency-Key"]).toBe("job-1");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ prompt: "a cat" });
  });

  it("maps statuses to pending, succeeded (image and video) and failed", async () => {
    const { fetchFn } = fakeFetch(
      { body: { status: "in_progress" } },
      { body: { status: "completed", images: [{ url: "https://cdn/x.png" }], expires_at: "2026-11-16T00:00:00Z" } },
      { body: { status: "completed", video: { url: "https://cdn/x.mp4", content_type: "video/mp4" } } },
      { body: { status: "nsfw" } },
      { body: { status: "failed", error: "Generation failed" } },
    );
    const hf = provider(fetchFn);
    expect(await hf.getStatus("r")).toEqual({ state: "pending" });
    expect(await hf.getStatus("r")).toEqual({
      state: "succeeded",
      outputs: [{ kind: "image", url: "https://cdn/x.png", contentType: undefined }],
      expiresAt: new Date("2026-11-16T00:00:00Z"),
    });
    expect(await hf.getStatus("r")).toMatchObject({ state: "succeeded", outputs: [{ kind: "video", url: "https://cdn/x.mp4" }] });
    expect(await hf.getStatus("r")).toMatchObject({ state: "failed", reason: "nsfw" });
    expect(await hf.getStatus("r")).toEqual({ state: "failed", reason: "failed", error: "Generation failed" });
  });

  it("turns HTTP errors into user-safe messages", async () => {
    const { fetchFn } = fakeFetch({ status: 403, body: { detail: "Insufficient balance" } }, { status: 429, body: {} });
    const hf = provider(fetchFn);
    const input = { model: "m", params: {}, idempotencyKey: "k" };
    const balance = await hf.submit(input).catch((e: unknown) => e);
    expect(balance).toBeInstanceOf(MediaProviderError);
    expect((balance as MediaProviderError).userMessage).not.toMatch(/balance/i);
    const busy = (await hf.submit(input).catch((e: unknown) => e)) as MediaProviderError;
    expect(busy.options.retryable).toBe(true);
  });

  it("verifies signed webhooks and rejects forged ones", async () => {
    const hf = provider(fakeFetch().fetchFn, WEBHOOK_SECRET);
    const body = JSON.stringify({ request_id: "req_9", status: "completed" });
    const at = Math.floor(Date.now() / 1000);
    const good = new Headers({
      "webhook-id": "m1",
      "webhook-timestamp": String(at),
      "webhook-signature": signStandardWebhook(WEBHOOK_SECRET, "m1", at, body),
    });
    expect(await hf.verifyWebhook(body, good)).toEqual({ requestId: "req_9" });
    await expect(hf.verifyWebhook(body, new Headers())).rejects.toBeInstanceOf(MediaWebhookSignatureError);

    // Without a secret configured, the body is only used to find the job (the result is re-fetched).
    const unsigned = provider(fakeFetch().fetchFn);
    expect(await unsigned.verifyWebhook(body, new Headers())).toEqual({ requestId: "req_9" });
    await expect(unsigned.verifyWebhook("not json", new Headers())).rejects.toBeInstanceOf(MediaWebhookSignatureError);
  });

  it("uploads inputs through a presigned URL without sending our credentials there", async () => {
    const { calls, fetchFn } = fakeFetch(
      {
        body: {
          public_url: "https://files/x.png",
          upload_url: "https://storage.example/presigned",
          upload_headers: { "Content-Type": "image/png", "x-amz-tagging": "retention=temporary" },
        },
      },
      { status: 200, body: {} },
    );
    const result = await provider(fetchFn).uploadInput({ data: new Uint8Array([1, 2, 3]), contentType: "image/png" });
    expect(result).toEqual({ url: "https://files/x.png" });
    expect(calls[0].url).toBe("https://api.higgsfield.ai/files/generate-upload-url");
    expect(calls[1].url).toBe("https://storage.example/presigned");
    const putHeaders = calls[1].init.headers as Record<string, string>;
    expect(putHeaders.Authorization).toBeUndefined();
    expect(putHeaders["x-amz-tagging"]).toBe("retention=temporary");
  });
});
