// GET /api/jobs?toolId=<id>: the signed-in user's recent jobs. While a job is unfinished,
// this also asks the provider about it (at most every 10 seconds per job), so jobs finish
// even when webhooks can't reach the app and no cron is set up.
import { getDb } from "@/db/client";
import { ACTIVE_JOB_STATUSES } from "@/db/schema";
import { getMediaProvider } from "@/lib/ai/media";
import { getSession } from "@/lib/auth/session";
import { listJobs, refreshJob } from "@/lib/jobs";
import { toJobView } from "@/lib/jobs/view";

const CHECK_EVERY_MS = 10_000;
/** Give the webhook a moment before checking ourselves. */
const FIRST_CHECK_AFTER_MS = 3_000;

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });

  const toolId = new URL(request.url).searchParams.get("toolId") ?? undefined;
  const db = getDb();
  const provider = getMediaProvider();
  const now = Date.now();

  const jobs = await Promise.all(
    (await listJobs(db, session.user.id, { toolId, limit: 12 })).map((job) =>
      provider &&
      job.kind !== "chat" &&
      ACTIVE_JOB_STATUSES.includes(job.status as never) &&
      now - job.createdAt.getTime() > FIRST_CHECK_AFTER_MS
        ? refreshJob(db, job, provider, { minIntervalMs: CHECK_EVERY_MS })
        : job,
    ),
  );

  return Response.json({ jobs: jobs.map(toJobView) }, { headers: { "Cache-Control": "no-store" } });
}
