// The shape of a job the browser sees: no provider ids, no internal fields.
import type { Job, JobOutput, JobStatus } from "@/db/schema";

export type JobView = {
  id: string;
  status: JobStatus;
  prompt: string;
  credits: number;
  error: string | null;
  outputs: Pick<JobOutput, "kind" | "url">[];
  createdAt: string;
  outputExpiresAt: string | null;
};

export function toJobView(job: Job): JobView {
  return {
    id: job.id,
    status: job.status,
    prompt: typeof job.input.prompt === "string" ? job.input.prompt : "",
    credits: job.credits,
    error: job.error,
    outputs: (job.output ?? []).map(({ kind, url }) => ({ kind, url })),
    createdAt: job.createdAt.toISOString(),
    outputExpiresAt: job.outputExpiresAt?.toISOString() ?? null,
  };
}
