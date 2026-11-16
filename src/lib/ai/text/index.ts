// Text AI through the Vercel AI SDK. The only file that imports a text-AI vendor package.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { siteConfig } from "@/config/site.config";
import { getEnv, isFeatureReady, readEnv } from "@/lib/env";

export type TextProviderName = "anthropic" | "openai";

/** Model ids per provider; each tool's config chooses its own. */
export type TextModels = Record<TextProviderName, string>;

/** Text providers whose API key is set, in preference order. */
export function configuredTextProviders(): TextProviderName[] {
  const report = readEnv();
  return (["anthropic", "openai"] as const).filter((name) => isFeatureReady(name, report));
}

/** The provider the chat tool uses (site.config.ts `ai.textProvider`), or null if none is set up. */
export function getTextProviderName(): TextProviderName | null {
  const configured = configuredTextProviders();
  const choice = siteConfig.ai.textProvider;
  if (choice === "auto") return configured[0] ?? null;
  return configured.includes(choice) ? choice : null;
}

export function getTextModel(models: TextModels): { provider: TextProviderName; model: LanguageModel } | null {
  const provider = getTextProviderName();
  if (!provider) return null;
  const env = getEnv();
  const model =
    provider === "anthropic"
      ? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(models.anthropic)
      : createOpenAI({ apiKey: env.OPENAI_API_KEY })(models.openai);
  return { provider, model };
}
