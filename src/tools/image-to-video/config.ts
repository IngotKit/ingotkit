import { siteConfig } from "@/config/site.config";

import type { MediaToolConfig } from "../types";

export const VIDEO_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const imageToVideoConfig: MediaToolConfig & {
  durationSeconds: number;
  resolution: string;
  maxPromptLength: number;
  maxUploadBytes: number;
} = {
  id: "image-to-video",
  kind: "media",
  output: "video",
  name: "Image to video",
  description: "Bring a picture to life: upload one or pick an image you made, and describe the motion.",
  credits: siteConfig.creditCosts.video,
  requires: ["media"],
  // Higgsfield model id (https://docs.higgsfield.ai/docs/models): Wan 2.6, 5 seconds at 720p.
  // Check its price in the Higgsfield console against `credits` above before going live.
  model: "wan/v2.6/image-to-video",
  durationSeconds: 5,
  resolution: "720p",
  maxPromptLength: 800,
  maxUploadBytes: 10 * 1024 * 1024,
};
