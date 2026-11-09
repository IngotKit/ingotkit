import { z } from "zod";

import { ToolInputError, type PreparedMediaJob } from "../types";
import { IMAGE_ASPECT_RATIOS, imageConfig } from "./config";

const schema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Describe the image in a few words.")
    .max(imageConfig.maxPromptLength, `Keep the description under ${imageConfig.maxPromptLength} characters.`),
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS, "Pick an aspect ratio from the list."),
});

export async function prepareImage(form: FormData): Promise<PreparedMediaJob> {
  const parsed = schema.safeParse({ prompt: form.get("prompt") ?? "", aspectRatio: form.get("aspectRatio") ?? "1:1" });
  if (!parsed.success) throw new ToolInputError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const { prompt, aspectRatio } = parsed.data;
  return {
    input: { prompt, aspectRatio },
    // Z-Image Turbo inputs: https://docs.higgsfield.ai/docs/models/z-image-turbo
    params: { prompt, aspect_ratio: aspectRatio, resolution: "1k", prompt_extend: false },
  };
}
