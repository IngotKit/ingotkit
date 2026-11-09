import { describe, expect, it } from "vitest";

import { prepareImage } from "@/tools/image/run";
import { tools } from "@/tools/registry";
import { ToolInputError, type MediaPrepareContext } from "@/tools/types";
import { prepareImageToVideo } from "@/tools/image-to-video/run";

function form(values: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("tool registry", () => {
  it("has unique ids, positive whole credit costs and a model per tool", () => {
    const ids = tools.map((t) => t.config.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { config } of tools) {
      expect(config.id).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isInteger(config.credits) && config.credits > 0).toBe(true);
      if (config.kind === "media") expect(config.model.length).toBeGreaterThan(0);
      else expect(config.models.anthropic && config.models.openai).toBeTruthy();
    }
  });
});

describe("image tool input", () => {
  it("builds the provider request from a valid form", async () => {
    const prepared = await prepareImage(form({ prompt: "  a red bicycle  ", aspectRatio: "16:9" }));
    expect(prepared.input).toEqual({ prompt: "a red bicycle", aspectRatio: "16:9" });
    expect(prepared.params).toMatchObject({ prompt: "a red bicycle", aspect_ratio: "16:9" });
  });

  it("rejects short prompts and unknown aspect ratios", async () => {
    await expect(prepareImage(form({ prompt: "x", aspectRatio: "1:1" }))).rejects.toBeInstanceOf(ToolInputError);
    await expect(prepareImage(form({ prompt: "a red bicycle", aspectRatio: "2:1" }))).rejects.toBeInstanceOf(ToolInputError);
  });
});

describe("image-to-video tool input", () => {
  const uploads: string[] = [];
  const ctx = {
    userId: "u1",
    db: {} as MediaPrepareContext["db"],
    provider: {
      uploadInput: async ({ contentType }: { contentType: string }) => {
        uploads.push(contentType);
        return { url: "https://files/input.png" };
      },
    },
  } as unknown as MediaPrepareContext;

  it("needs an image", async () => {
    await expect(prepareImageToVideo(form({ prompt: "slow zoom" }), ctx)).rejects.toThrow(/Upload an image/);
  });

  it("uploads a valid image and passes its URL to the provider", async () => {
    const image = new File([new Uint8Array([137, 80, 78, 71])], "in.png", { type: "image/png" });
    const prepared = await prepareImageToVideo(form({ prompt: "slow zoom", image }), ctx);
    expect(uploads).toEqual(["image/png"]);
    expect(prepared.params).toMatchObject({ prompt: "slow zoom", image_url: "https://files/input.png" });
  });

  it("rejects other file types", async () => {
    const pdf = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });
    await expect(prepareImageToVideo(form({ prompt: "slow zoom", image: pdf }), ctx)).rejects.toThrow(/JPEG, PNG or WebP/);
  });
});
