// Streams a chat reply. One credit-priced job per message: reserved before the model is
// called, committed when the reply finishes (or the user stops it), refunded if it errors.
import { convertToModelMessages, safeValidateUIMessages, streamText } from "ai";

import { getTextModel } from "@/lib/ai/text";
import { settleJob, startChatJob } from "@/lib/jobs";

import { ToolInputError, type ChatRunContext } from "../types";
import { chatConfig } from "./config";

export class ChatNotConfiguredError extends Error {
  constructor() {
    super("No text AI provider is configured.");
    this.name = "ChatNotConfiguredError";
  }
}

const MAX_MESSAGE_CHARS = 8_000;

function lastUserText(messages: ChatRunContext["messages"]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return (last?.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export async function runChat({ db, userId, messages, abortSignal }: ChatRunContext): Promise<Response> {
  const text = getTextModel(chatConfig.models);
  if (!text) throw new ChatNotConfiguredError();

  // Only plain user/assistant text from the browser; never system messages or tool calls.
  const validated = await safeValidateUIMessages({ messages });
  if (!validated.success) throw new ToolInputError("That message couldn't be read. Refresh the page and try again.");
  const history = validated.data
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ ...m, parts: m.parts.filter((part) => part.type === "text") }))
    .slice(-chatConfig.maxHistory);

  const prompt = lastUserText(history);
  if (!prompt) throw new ToolInputError("Type a message first.");
  if (prompt.length > MAX_MESSAGE_CHARS) throw new ToolInputError(`Messages can be up to ${MAX_MESSAGE_CHARS} characters.`);

  const chatJob = await startChatJob(db, {
    userId,
    toolId: chatConfig.id,
    provider: text.provider,
    credits: chatConfig.credits,
    input: { prompt: prompt.slice(0, 500), historyLength: history.length },
  });

  const result = streamText({
    model: text.model,
    system: chatConfig.system,
    messages: await convertToModelMessages(history),
    maxOutputTokens: chatConfig.maxOutputTokens,
    abortSignal,
    // Settle exactly once: settleJob ignores later calls for the same job.
    onFinish: async () => {
      await settleJob(db, chatJob.id, { status: "succeeded" });
    },
    // The user stopped the reply: the model already did the work, so the message is charged.
    onAbort: async () => {
      await settleJob(db, chatJob.id, { status: "succeeded" });
    },
    onError: async ({ error }) => {
      console.error("[chat] generation failed", error);
      await settleJob(db, chatJob.id, { status: "failed", error: "The AI couldn't reply." });
    },
  });

  return result.toUIMessageStreamResponse({
    onError: () => "The AI couldn't reply right now. Your credit was refunded.",
  });
}
