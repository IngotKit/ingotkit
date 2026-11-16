"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

import type { ToolFormProps } from "../types";

export function ChatForm({ toolId, credits, enabled }: ToolFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: `/api/tools/${toolId}` }),
    // Refresh the server-rendered balance after each reply.
    onFinish: () => router.refresh(),
    onError: () => router.refresh(),
  });
  const busy = status === "submitted" || status === "streaming";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-48 flex-col gap-3 rounded-lg border p-4" aria-live="polite" data-testid="chat-messages">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Start the conversation below.</p>}
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
            <p className="mb-1 text-xs text-muted-foreground">{message.role === "user" ? "You" : "AI"}</p>
            <div
              className={
                message.role === "user"
                  ? "rounded-lg bg-primary px-3 py-2 text-primary-foreground whitespace-pre-wrap"
                  : "rounded-lg bg-muted px-3 py-2 whitespace-pre-wrap"
              }
            >
              {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
            </div>
          </div>
        ))}
        {status === "submitted" && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </div>

      {error && (
        <p role="status" className="text-sm text-destructive">
          {error.message || "Something went wrong. Please try again."}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={3}
          maxLength={8000}
          disabled={!enabled}
          placeholder={enabled ? "Type a message. Enter sends, Shift+Enter adds a line." : "Chat isn't available."}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {credits} credit{credits === 1 ? "" : "s"} per message
          </p>
          {busy ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!enabled || !draft.trim()}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
