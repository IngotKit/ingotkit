// Payment webhooks: POST /api/webhooks/polar and /api/webhooks/stripe.
import { getDb } from "@/db/client";
import { getProviderByName, WebhookSignatureError } from "@/lib/billing";
import { applyWebhook } from "@/lib/billing/webhooks";

export async function POST(request: Request, ctx: RouteContext<"/api/webhooks/[provider]">): Promise<Response> {
  const { provider: name } = await ctx.params;
  const provider = getProviderByName(name);
  if (!provider) {
    return Response.json({ error: `Payments via "${name}" are not configured.` }, { status: 404 });
  }

  // The signature covers the exact bytes, so read the raw body before any parsing.
  const rawBody = await request.text();
  let event;
  try {
    event = await provider.parseWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
    throw error;
  }

  const result = await applyWebhook(getDb(), provider.name, event);
  return Response.json({ received: true, ...result });
}
