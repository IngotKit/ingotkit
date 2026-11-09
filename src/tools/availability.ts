// Whether a tool can run with the current settings. Server only.
import { getMediaProvider } from "@/lib/ai/media";
import { getTextProviderName } from "@/lib/ai/text";

import type { Tool } from "./types";

export function isToolAvailable(tool: Tool): boolean {
  return tool.config.kind === "chat" ? getTextProviderName() !== null : getMediaProvider() !== null;
}

/** What to tell users (and the site owner) when a tool isn't set up. */
export function unavailableMessage(tool: Tool): string {
  return tool.config.kind === "chat"
    ? "Chat isn't set up yet: add an Anthropic or OpenAI API key (see /setup)."
    : "Image and video generation isn't set up yet: add the Higgsfield API keys (see /setup).";
}
