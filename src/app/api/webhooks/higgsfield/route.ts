// POST /api/webhooks/higgsfield: Higgsfield calls this when a generation finishes.
// The payload only tells us which request to look at; the result itself is fetched from
// Higgsfield's API with our key, so a forged or replayed call can't fake an outcome.
import { getDb } from "@/db/client";
import { getMediaProvider, MediaWebhookSignatureError } from "@/lib/ai/media";
import { findJobByRequestId, refreshJob } from "@/lib/jobs";

export async function POST(request: Request): Promise<Response> {
  const provider = getMediaProvider();
  if (!provider || provider.name !== "higgsfield") {
    return Response.json({ error: "Higgsfield is not configured." }, { status: 404 });
  }

  const rawBody = await request.text();
  let requestId: string;
  try {
    ({ requestId } = await provider.verifyWebhook(rawBody, request.headers));
  } catch (error) {
    if (error instanceof MediaWebhookSignatureError) return Response.json({ error: error.message }, { status: 401 });
    throw error;
  }

  const db = getDb();
  const job = await findJobByRequestId(db, provider.name, requestId);
  // Not ours (or already deleted): acknowledge so Higgsfield stops retrying.
  if (!job) return Response.json({ received: true, ignored: "unknown request" });

  const current = await refreshJob(db, job, provider);
  // Higgsfield only calls once a job is final. If we couldn't confirm that (its API was
  // unreachable), answer 503 so it retries; polling and cron are further fallbacks.
  if (current.status === "queued" || current.status === "running") {
    return Response.json({ received: true, retry: "status not final yet" }, { status: 503 });
  }
  return Response.json({ received: true, status: current.status });
}
