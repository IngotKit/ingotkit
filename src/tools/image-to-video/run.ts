import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { job } from "@/db/schema";

import { ToolInputError, type MediaPrepareContext, type PreparedMediaJob } from "../types";
import { VIDEO_INPUT_TYPES, imageToVideoConfig as config } from "./config";

const schema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Describe the motion in a few words.")
    .max(config.maxPromptLength, `Keep the description under ${config.maxPromptLength} characters.`),
  sourceJobId: z.string().uuid().optional(),
});

/** An image the user generated earlier, if it's theirs and its link still works. */
async function imageFromJob(ctx: MediaPrepareContext, jobId: string): Promise<string> {
  const [source] = await ctx.db
    .select()
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.userId, ctx.userId), eq(job.status, "succeeded")));
  const url = source?.output?.find((o) => o.kind === "image")?.url;
  if (!source || !url) throw new ToolInputError("That image isn't available. Pick another or upload one.");
  if (source.outputExpiresAt && source.outputExpiresAt < new Date()) {
    throw new ToolInputError("That image's link has expired. Upload the image instead.");
  }
  return url;
}

async function imageFromUpload(ctx: MediaPrepareContext, file: File): Promise<string> {
  if (!(VIDEO_INPUT_TYPES as readonly string[]).includes(file.type)) {
    throw new ToolInputError("Upload a JPEG, PNG or WebP image.");
  }
  if (file.size > config.maxUploadBytes) {
    throw new ToolInputError(`The image must be under ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  // Goes straight to the provider's temporary storage; nothing is written to this server's disk.
  const { url } = await ctx.provider.uploadInput({ data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  return url;
}

export async function prepareImageToVideo(form: FormData, ctx: MediaPrepareContext): Promise<PreparedMediaJob> {
  const sourceJobId = form.get("sourceJobId");
  const parsed = schema.safeParse({
    prompt: form.get("prompt") ?? "",
    sourceJobId: typeof sourceJobId === "string" && sourceJobId ? sourceJobId : undefined,
  });
  if (!parsed.success) throw new ToolInputError(parsed.error.issues[0]?.message ?? "Check the form and try again.");

  const upload = form.get("image");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (!file && !parsed.data.sourceJobId) throw new ToolInputError("Upload an image or pick one you made.");

  const imageUrl = file ? await imageFromUpload(ctx, file) : await imageFromJob(ctx, parsed.data.sourceJobId!);
  const { prompt } = parsed.data;
  return {
    input: { prompt, imageUrl, sourceJobId: parsed.data.sourceJobId ?? null },
    // Wan 2.6 image-to-video inputs: https://docs.higgsfield.ai/docs/models/wan-2-6/image-to-video
    params: { prompt, image_url: imageUrl, duration: config.durationSeconds, resolution: config.resolution },
  };
}
