import type { MediaTool } from "../types";
import { imageConfig } from "./config";
import { ImageForm } from "./form";
import { prepareImage } from "./run";

export const imageTool: MediaTool = { config: imageConfig, Form: ImageForm, prepare: prepareImage };
