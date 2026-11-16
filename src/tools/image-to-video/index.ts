import type { MediaTool } from "../types";
import { imageToVideoConfig } from "./config";
import { ImageToVideoForm } from "./form";
import { prepareImageToVideo } from "./run";

export const imageToVideoTool: MediaTool = { config: imageToVideoConfig, Form: ImageToVideoForm, prepare: prepareImageToVideo };
