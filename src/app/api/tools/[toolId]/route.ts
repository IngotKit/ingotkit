// POST /api/tools/<id>: runs a tool for the signed-in user.
// Chat tools take the AI SDK's JSON body and stream the reply. Media tools take a form
// (multipart, so images can be uploaded) and return the new job.
import { getDb } from "@/db/client";
import { getMediaProvider, mediaWebhookUrl, MediaProviderError } from "@/lib/ai/media";
import { getSession } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { InsufficientCreditsError, startMediaJob, TooManyActiveJobsError } from "@/lib/jobs";
import { toJobView } from "@/lib/jobs/view";
import { isToolAvailable, unavailableMessage } from "@/tools/availability";
import { getTool } from "@/tools/registry";
import { ToolInputError } from "@/tools/types";

function describeError(error: unknown): { message: string; status: number } {
  if (error instanceof ToolInputError) return { message: error.message, status: 400 };
  if (error instanceof InsufficientCreditsError) {
    return {
      message: `Not enough credits: this needs ${error.needed} and you have ${error.balance}. Buy more on the billing page.`,
      status: 402,
    };
  }
  if (error instanceof TooManyActiveJobsError) return { message: error.message, status: 429 };
  if (error instanceof MediaProviderError) {
    console.error("[tools]", error);
    return { message: error.userMessage, status: 502 };
  }
  console.error("[tools] unexpected error", error);
  return { message: "Something went wrong. Please try again.", status: 500 };
}

/** Media forms read JSON; the chat client shows a plain-text error body as the message. */
function errorResponse(error: unknown, asText = false): Response {
  const { message, status } = describeError(error);
  return asText ? new Response(message, { status }) : Response.json({ error: message }, { status });
}

export async function POST(request: Request, ctx: RouteContext<"/api/tools/[toolId]">): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });

  const { toolId } = await ctx.params;
  const tool = getTool(toolId);
  if (!tool) return Response.json({ error: "Unknown tool." }, { status: 404 });
  if (!isToolAvailable(tool)) return Response.json({ error: unavailableMessage(tool) }, { status: 503 });

  const db = getDb();
  const userId = session.user.id;

  if ("run" in tool) {
    try {
      const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
      if (!body || !Array.isArray(body.messages)) throw new ToolInputError("Send a message to start.");
      return await tool.run({ db, userId, messages: body.messages, abortSignal: request.signal });
    } catch (error) {
      return errorResponse(error, true);
    }
  }

  try {
    const provider = getMediaProvider()!;
    // Cheap early check so an upload isn't wasted; startMediaJob re-checks with a lock.
    const balance = await getBalance(db, userId);
    if (balance < tool.config.credits) throw new InsufficientCreditsError(balance, tool.config.credits);
    const form = await request.formData().catch(() => null);
    if (!form) throw new ToolInputError("The form couldn't be read. Please try again.");
    const { input, params } = await tool.prepare(form, { db, userId, provider });
    const created = await startMediaJob(db, {
      userId,
      toolId: tool.config.id,
      kind: tool.config.output,
      credits: tool.config.credits,
      input,
      provider,
      model: tool.config.model,
      params,
      webhookUrl: mediaWebhookUrl(provider),
    });
    return Response.json({ job: toJobView(created) });
  } catch (error) {
    return errorResponse(error);
  }
}
