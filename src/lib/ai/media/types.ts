// The contract every image/video provider implements. Jobs and tools only talk to this
// interface; vendor code stays inside its adapter file (higgsfield.ts, fake.ts).
import type { JobOutput } from "@/db/schema";

export type MediaProviderName = "higgsfield" | "fake";

export type SubmitInput = {
  /** The provider's model or endpoint id, from the tool's config (e.g. "z-image/turbo"). */
  model: string;
  /** Model-specific parameters (prompt, aspect ratio, input image URL…). */
  params: Record<string, unknown>;
  /** Where the provider should POST when the job finishes. Omitted when the app isn't public. */
  webhookUrl?: string;
  /** Our job id: the same request is never started twice. */
  idempotencyKey: string;
};

export type MediaStatus =
  | { state: "pending" }
  | { state: "succeeded"; outputs: JobOutput[]; expiresAt?: Date }
  | { state: "failed"; reason: "failed" | "nsfw" | "canceled"; error?: string };

export type UploadInput = { data: Uint8Array; contentType: string };

export interface MediaProvider {
  readonly name: MediaProviderName;
  submit(input: SubmitInput): Promise<{ requestId: string }>;
  getStatus(requestId: string): Promise<MediaStatus>;
  /**
   * Checks a webhook's signature (when a secret is configured) and returns the request it is
   * about. Callers never trust the payload's status: they ask getStatus() for the result.
   * Throws MediaWebhookSignatureError when the signature is wrong.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<{ requestId: string }>;
  /** Stores an input file (e.g. the image for image-to-video) and returns a URL the provider can read. */
  uploadInput(file: UploadInput): Promise<{ url: string }>;
}

/** Raised by adapters for provider errors. `userMessage` is safe to show to the user. */
export class MediaProviderError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
    readonly options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "MediaProviderError";
  }
}

export class MediaWebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "MediaWebhookSignatureError";
  }
}
