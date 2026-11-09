// GET or POST /api/cron/poll-jobs, called by hPanel cron every few minutes:
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/poll-jobs
// Finishes jobs whose webhook never arrived and refunds jobs that ran past the timeout.
import { timingSafeEqual } from "node:crypto";

import { getDb } from "@/db/client";
import { getMediaProvider } from "@/lib/ai/media";
import { getEnv } from "@/lib/env";
import { pollActiveJobs } from "@/lib/jobs";

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(request: Request): Promise<Response> {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set (see /setup)." }, { status: 503 });
  if (!authorized(request, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await pollActiveJobs(getDb(), getMediaProvider());
  return Response.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
