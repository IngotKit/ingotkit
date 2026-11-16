// Higgsfield adapter (https://docs.higgsfield.ai). Plain fetch: we only need submit, status,
// upload and webhook checks, and Higgsfield's SDK is built around waiting for results, which
// doesn't fit apps that stop between requests.
import { z } from "zod";

import type { JobOutput } from "@/db/schema";
import { StandardWebhookError, verifyStandardWebhook } from "@/lib/webhooks/standard";

import {
  MediaProviderError,
  MediaWebhookSignatureError,
  type MediaProvider,
  type MediaStatus,
  type SubmitInput,
  type UploadInput,
} from "./types";

export type HiggsfieldConfig = {
  keyId: string;
  keySecret: string;
  /** "whsec_..." from Higgsfield Console → Settings. Without it, webhooks are accepted unsigned. */
  webhookSecret?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

const DEFAULT_BASE_URL = "https://api.higgsfield.ai";
const TIMEOUT_MS = 30_000;

const submitResponse = z.object({ request_id: z.string().min(1) });

const media = z.object({ url: z.string(), content_type: z.string().optional() });

const statusResponse = z.object({
  status: z.enum(["queued", "in_progress", "completed", "failed", "nsfw", "canceled"]),
  error: z.string().nullish(),
  images: z.array(media).nullish(),
  video: media.nullish(),
  expires_at: z.string().nullish(),
});

const uploadResponse = z.object({
  public_url: z.string().min(1),
  upload_url: z.string().min(1),
  upload_headers: z.record(z.string(), z.string()).default({}),
});

const webhookBody = z.object({ request_id: z.string().min(1) });

/** Turns an HTTP failure into an error with a message that is safe to show users. */
async function toError(response: Response, action: string): Promise<MediaProviderError> {
  const body = await response.text().catch(() => "");
  const detail = `${action}: Higgsfield returned ${response.status} ${body.slice(0, 300)}`;
  const status = response.status;
  if (status === 400 || status === 422) {
    return new MediaProviderError(detail, "The generator didn't accept these settings. Try a different prompt or image.", { status });
  }
  if (status === 401) {
    return new MediaProviderError(detail, "The image and video service isn't set up correctly. Please tell the site owner.", { status });
  }
  if (status === 403) {
    return new MediaProviderError(detail, "The image and video service is temporarily unavailable. Please try again later.", { status });
  }
  if (status === 429 || status === 503 || status >= 500) {
    return new MediaProviderError(detail, "The generator is busy right now. Please try again in a minute.", { status, retryable: true });
  }
  return new MediaProviderError(detail, "The generator returned an error. Please try again.", { status });
}

export function createHiggsfieldProvider(config: HiggsfieldConfig): MediaProvider {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const doFetch = config.fetch ?? fetch;
  const auth = { Authorization: `Key ${config.keyId}:${config.keySecret}` };

  async function call(path: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      throw new MediaProviderError(
        `Higgsfield request failed: ${error instanceof Error ? error.message : String(error)}`,
        "Couldn't reach the generator. Please try again in a minute.",
        { retryable: true },
      );
    }
  }

  return {
    name: "higgsfield",

    async submit({ model, params, webhookUrl, idempotencyKey }: SubmitInput) {
      const path = `/${model.replace(/^\//, "")}${webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : ""}`;
      const response = await call(path, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw await toError(response, "submit");
      const parsed = submitResponse.safeParse(await response.json());
      if (!parsed.success) {
        throw new MediaProviderError("submit: Higgsfield response had no request_id", "The generator returned an error. Please try again.");
      }
      return { requestId: parsed.data.request_id };
    },

    async getStatus(requestId: string): Promise<MediaStatus> {
      const response = await call(`/requests/${encodeURIComponent(requestId)}/status`, { method: "GET", headers: auth });
      if (!response.ok) throw await toError(response, "status");
      const parsed = statusResponse.safeParse(await response.json());
      if (!parsed.success) throw new MediaProviderError("status: unexpected Higgsfield response", "The generator returned an error.");

      const status = parsed.data;
      switch (status.status) {
        case "queued":
        case "in_progress":
          return { state: "pending" };
        case "completed": {
          const outputs: JobOutput[] = [
            ...(status.images ?? []).map((m) => ({ kind: "image" as const, url: m.url, contentType: m.content_type })),
            ...(status.video ? [{ kind: "video" as const, url: status.video.url, contentType: status.video.content_type }] : []),
          ];
          if (outputs.length === 0) return { state: "failed", reason: "failed", error: "The generator returned no output." };
          return { state: "succeeded", outputs, expiresAt: status.expires_at ? new Date(status.expires_at) : undefined };
        }
        case "nsfw":
          return { state: "failed", reason: "nsfw", error: "The content was blocked by the generator's safety filter." };
        case "canceled":
          return { state: "failed", reason: "canceled", error: "The generation was canceled." };
        default:
          return { state: "failed", reason: "failed", error: status.error ?? "The generation failed." };
      }
    },

    async verifyWebhook(rawBody: string, headers: Headers) {
      if (config.webhookSecret) {
        try {
          verifyStandardWebhook(config.webhookSecret, rawBody, headers);
        } catch (error) {
          if (error instanceof StandardWebhookError) throw new MediaWebhookSignatureError(error.message);
          throw error;
        }
      }
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new MediaWebhookSignatureError("Webhook body is not JSON");
      }
      const parsed = webhookBody.safeParse(json);
      if (!parsed.success) throw new MediaWebhookSignatureError("Webhook body has no request_id");
      return { requestId: parsed.data.request_id };
    },

    async uploadInput({ data, contentType }: UploadInput) {
      const response = await call("/files/generate-upload-url", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: contentType }),
      });
      if (!response.ok) throw await toError(response, "upload-url");
      const parsed = uploadResponse.safeParse(await response.json());
      if (!parsed.success) throw new MediaProviderError("upload-url: unexpected Higgsfield response", "Couldn't upload the image.");

      // The presigned URL is not Higgsfield's API: never send our credentials to it.
      let put: Response;
      try {
        put = await doFetch(parsed.data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": contentType, ...parsed.data.upload_headers },
          body: data as BodyInit,
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        throw new MediaProviderError(`upload: ${String(error)}`, "Couldn't upload the image. Please try again.", { retryable: true });
      }
      if (!put.ok) throw new MediaProviderError(`upload: storage returned ${put.status}`, "Couldn't upload the image. Please try again.");
      return { url: parsed.data.public_url };
    },
  };
}
