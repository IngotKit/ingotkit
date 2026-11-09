import { siteConfig } from "@/config/site.config";

import type { ChatToolConfig } from "../types";

export const chatConfig: ChatToolConfig = {
  id: "chat",
  kind: "chat",
  name: "AI chat",
  description: "Ask anything. Replies stream in as they're written.",
  credits: siteConfig.creditCosts.chatMessage,
  requires: ["anthropic", "openai"],
  // Which model answers. Anthropic is used when its key is set (site.config.ts `ai.textProvider`).
  models: { anthropic: "claude-opus-5-5", openai: "gpt-5.6" },
  system: `You are the helpful assistant inside ${siteConfig.name}. Answer clearly and concisely. Use Markdown for lists and code.`,
  maxOutputTokens: 4000,
  maxHistory: 20,
};
