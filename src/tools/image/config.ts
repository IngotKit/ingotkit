import { siteConfig } from "@/config/site.config";

import type { MediaToolConfig } from "../types";

export const IMAGE_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export const imageConfig: MediaToolConfig & { aspectRatios: typeof IMAGE_ASPECT_RATIOS; maxPromptLength: number } = {
  id: "image",
  kind: "media",
  output: "image",
  name: "Image generator",
  description: "Describe a picture and get it in a few seconds.",
  credits: siteConfig.creditCosts.image,
  requires: ["media"],
  // Higgsfield model id (https://docs.higgsfield.ai/docs/models): fast, low-cost text-to-image.
  model: "z-image/turbo",
  aspectRatios: IMAGE_ASPECT_RATIOS,
  maxPromptLength: 800,
};
