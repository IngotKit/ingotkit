"use client";

import { useState, type FormEvent } from "react";

import { useMediaSubmit } from "@/components/tools/use-media-submit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { ToolFormProps } from "../types";
import { VIDEO_INPUT_TYPES, imageToVideoConfig } from "./config";

export function ImageToVideoForm({ toolId, credits, enabled, recentImages }: ToolFormProps) {
  const { submit, pending, error } = useMediaSubmit(toolId);
  const [sourceJobId, setSourceJobId] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await submit(new FormData(form))) {
      form.reset();
      setSourceJobId("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3" disabled={!enabled}>
        <legend className="mb-2 text-sm font-medium">Starting image</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="image">Upload an image (JPEG, PNG or WebP, up to 10 MB)</Label>
          <input
            id="image"
            name="image"
            type="file"
            accept={VIDEO_INPUT_TYPES.join(",")}
            onChange={() => setSourceJobId("")}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1 file:text-sm"
          />
        </div>
        {recentImages.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">…or pick one you made:</p>
            <input type="hidden" name="sourceJobId" value={sourceJobId} />
            <div className="flex flex-wrap gap-2">
              {recentImages.map((image) => (
                <button
                  key={image.jobId}
                  type="button"
                  onClick={() => setSourceJobId(image.jobId === sourceJobId ? "" : image.jobId)}
                  aria-pressed={image.jobId === sourceJobId}
                  title={image.prompt}
                  className="overflow-hidden rounded-md border-2 border-transparent aria-pressed:border-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.prompt} className="size-20 object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">Describe the motion</Label>
        <textarea
          id="prompt"
          name="prompt"
          required
          minLength={3}
          maxLength={800}
          rows={3}
          disabled={!enabled}
          placeholder="Slow camera push-in, waves crashing, clouds drifting"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </div>
      {error && (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!enabled || pending}>
          {pending ? "Starting…" : `Make video (${credits} credits)`}
        </Button>
        <span className="text-xs text-muted-foreground">
          {imageToVideoConfig.durationSeconds} seconds, {imageToVideoConfig.resolution}. Usually takes a few minutes.
        </span>
      </div>
    </form>
  );
}
