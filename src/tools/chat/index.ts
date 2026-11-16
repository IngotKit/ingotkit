import type { ChatTool } from "../types";
import { chatConfig } from "./config";
import { ChatForm } from "./form";
import { runChat } from "./run";

export const chatTool: ChatTool = { config: chatConfig, Form: ChatForm, run: runChat };
