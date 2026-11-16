// Every AI tool in the app. To add one: create src/tools/<name>/ (config.ts, form.tsx, run.ts,
// index.ts; copy an existing tool) and add it to this list. Pages, the dashboard, the API
// route, credits and jobs pick it up from here.
import { chatTool } from "./chat";
import { imageTool } from "./image";
import { imageToVideoTool } from "./image-to-video";
import type { Tool } from "./types";

export const tools: Tool[] = [chatTool, imageTool, imageToVideoTool];

export function getTool(id: string): Tool | undefined {
  return tools.find((tool) => tool.config.id === id);
}
