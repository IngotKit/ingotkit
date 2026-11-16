"use client";

import { type FormEvent } from "react";

import { useMediaSubmit } from "@/components/tools/use-media-submit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { ToolFormProps } from "../types";
import { IMAGE_ASPECT_RATIOS } from "./config";

export function ImageForm({ toolId, credits, enabled }: ToolFormProps) {
  const { submit, pending, error } = useMediaSubmit(toolId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await submit(new FormData(form))) form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">Describe the image</Label>
        <textarea
          id="prompt"
          name="prompt"
          required
          minLength={3}
          maxLength={800}
          rows={3}
          disabled={!enabled}
          placeholder="A lighthouse on a cliff at sunset, watercolor"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="aspectRatio">Aspect ratio</Label>
        <select
          id="aspectRatio"
          name="aspectRatio"
          defaultValue="1:1"
          disabled={!enabled}
          className="h-8 w-40 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          {IMAGE_ASPECT_RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={!enabled || pending}>
          {pending ? "Starting…" : `Generate (${credits} credits)`}
        </Button>
      </div>
    </form>
  );
}
