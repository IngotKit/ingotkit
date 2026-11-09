// Test-only media provider: no network, no cost. Turned on with FAKE_MEDIA_PROVIDER=1 for the
// automated tests; /setup warns loudly if it is on. A prompt containing "[fail]" fails, so
// tests can check that failed jobs refund their credits.
import type { MediaProvider, MediaStatus } from "./types";

const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#374151">Test image</text></svg>',
  );

export function createFakeMediaProvider(): MediaProvider {
  return {
    name: "fake",

    async submit({ model, params }) {
      const outcome = String(params.prompt ?? "").includes("[fail]") ? "fail" : "ok";
      const kind = model.includes("video") ? "video" : "image";
      return { requestId: `fake_${outcome}_${kind}_${crypto.randomUUID()}` };
    },

    async getStatus(requestId): Promise<MediaStatus> {
      const [, outcome, kind] = requestId.split("_");
      if (outcome === "fail") return { state: "failed", reason: "failed", error: "Test failure requested with [fail]." };
      return {
        state: "succeeded",
        outputs: [{ kind: kind === "video" ? "video" : "image", url: PLACEHOLDER_SVG, contentType: "image/svg+xml" }],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    },

    async verifyWebhook(rawBody) {
      const { request_id: requestId } = JSON.parse(rawBody) as { request_id: string };
      return { requestId };
    },

    async uploadInput() {
      return { url: `https://example.invalid/fake-upload/${crypto.randomUUID()}.png` };
    },
  };
}
