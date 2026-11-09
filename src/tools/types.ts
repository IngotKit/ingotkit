// What a tool is. Each tool lives in its own folder (config.ts, form.tsx, run.ts, index.ts)
// and is listed once in registry.ts. Nothing else in the app needs to change to add one.
import type { UIMessage } from "ai";
import type { ComponentType } from "react";

import type { Db } from "@/db/client";
import type { MediaProvider } from "@/lib/ai/media";
import type { TextModels } from "@/lib/ai/text";
import type { Feature } from "@/lib/env";

type ToolConfigBase = {
  /** URL slug: the tool lives at /tools/<id>. */
  id: string;
  name: string;
  description: string;
  /** Credits per use. Defaults come from siteConfig.creditCosts. */
  credits: number;
  /** Settings this tool needs; /tools/<id> explains what to set up when they're missing. */
  requires: Feature[];
};

export type ChatToolConfig = ToolConfigBase & {
  kind: "chat";
  models: TextModels;
  system: string;
  maxOutputTokens: number;
  /** Only the most recent messages are sent to the model (keeps cost per message bounded). */
  maxHistory: number;
};

export type MediaToolConfig = ToolConfigBase & {
  kind: "media";
  output: "image" | "video";
  /** The media provider's model id, e.g. "z-image/turbo". */
  model: string;
};

export type ToolConfig = ChatToolConfig | MediaToolConfig;

/** Data the page passes to every tool form. */
export type ToolFormProps = {
  toolId: string;
  credits: number;
  /** False when the tool's settings are missing or the user can't afford it. */
  enabled: boolean;
  /** The user's recent images that can still be used as inputs (image-to-video). */
  recentImages: { jobId: string; url: string; prompt: string }[];
};

/** A user-facing problem with what was submitted (shown as-is). */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export type ChatRunContext = { db: Db; userId: string; messages: UIMessage[]; abortSignal: AbortSignal };

export type MediaPrepareContext = { db: Db; userId: string; provider: MediaProvider };

/** What a media tool's run.ts returns: `input` is saved on the job, `params` go to the provider. */
export type PreparedMediaJob = { input: Record<string, unknown>; params: Record<string, unknown> };

export type ChatTool = {
  config: ChatToolConfig;
  Form: ComponentType<ToolFormProps>;
  /** Streams the reply; must start a chat job so the message is paid for (see tools/chat/run.ts). */
  run: (ctx: ChatRunContext) => Promise<Response>;
};

export type MediaTool = {
  config: MediaToolConfig;
  Form: ComponentType<ToolFormProps>;
  /** Validates the submitted form and builds the provider request. Throw ToolInputError for bad input. */
  prepare: (form: FormData, ctx: MediaPrepareContext) => Promise<PreparedMediaJob>;
};

export type Tool = ChatTool | MediaTool;
