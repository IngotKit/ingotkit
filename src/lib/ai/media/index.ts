// Picks the media provider from env. Nothing outside src/lib/ai/media talks to a vendor.
import { getEnv, isFeatureReady, readEnv } from "@/lib/env";

import { createFakeMediaProvider } from "./fake";
import { createHiggsfieldProvider } from "./higgsfield";
import type { MediaProvider } from "./types";

export * from "./types";

/** The configured image/video provider, or null when none is set up. */
export function getMediaProvider(): MediaProvider | null {
  const report = readEnv();
  const env = report.values;
  if (env.FAKE_MEDIA_PROVIDER === "1") return createFakeMediaProvider();
  if (!isFeatureReady("media", report)) return null;
  return createHiggsfieldProvider({
    keyId: env.HIGGSFIELD_API_KEY_ID!,
    keySecret: env.HIGGSFIELD_API_KEY_SECRET!,
    webhookSecret: env.HIGGSFIELD_WEBHOOK_SECRET,
  });
}

/** True when the test-only fake provider is switched on. */
export function isFakeMediaEnabled(): boolean {
  return getEnv().FAKE_MEDIA_PROVIDER === "1";
}

/**
 * The URL providers should POST to when a job finishes, or undefined when this app can't
 * receive webhooks (plain-http localhost). Jobs then finish by checking: while the page is
 * open, or from the cron route.
 */
export function mediaWebhookUrl(provider: MediaProvider): string | undefined {
  const env = getEnv();
  const base = env.WEBHOOK_BASE_URL ?? env.APP_URL;
  if (!base || !base.startsWith("https://")) return undefined;
  return new URL(`/api/webhooks/${provider.name}`, base).toString();
}
