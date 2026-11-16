"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { JobView } from "@/lib/jobs/view";

import { JOB_STARTED_EVENT } from "./use-media-submit";

const POLL_MS = 3_000;

const STATUS_LABEL: Record<JobView["status"], string> = {
  queued: "Starting",
  running: "Generating",
  succeeded: "Done",
  failed: "Failed",
};

/** The user's recent generations for one tool. Polls while any of them is unfinished. */
export function JobList({ toolId, initialJobs }: { toolId: string; initialJobs: JobView[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const activeRef = useRef(initialJobs.some((j) => j.status === "queued" || j.status === "running"));

  const load = useCallback(async () => {
    const response = await fetch(`/api/jobs?toolId=${encodeURIComponent(toolId)}`, { cache: "no-store" });
    if (!response.ok) return;
    const { jobs: next } = (await response.json()) as { jobs: JobView[] };
    const wasActive = activeRef.current;
    activeRef.current = next.some((j) => j.status === "queued" || j.status === "running");
    setJobs(next);
    // A job just finished: refresh the server-rendered balance (refunds show up here).
    if (wasActive && !activeRef.current) router.refresh();
  }, [toolId, router]);

  useEffect(() => {
    const onStarted = () => {
      activeRef.current = true;
      void load();
    };
    window.addEventListener(JOB_STARTED_EVENT, onStarted);
    const timer = window.setInterval(() => {
      if (activeRef.current) void load();
    }, POLL_MS);
    return () => {
      window.removeEventListener(JOB_STARTED_EVENT, onStarted);
      window.clearInterval(timer);
    };
  }, [load]);

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">Your generations will appear here.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2" data-testid="job-list">
      {jobs.map((job) => (
        <li key={job.id} className="flex flex-col gap-2 rounded-lg border p-3" data-testid="job" data-status={job.status}>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={job.status === "failed" ? "destructive" : job.status === "succeeded" ? "default" : "secondary"}>
              {STATUS_LABEL[job.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
          </div>
          <p className="line-clamp-2 text-sm">{job.prompt}</p>
          {(job.status === "queued" || job.status === "running") && (
            <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
              Working on it…
            </div>
          )}
          {job.outputs.map((output) =>
            output.kind === "video" ? (
              <video key={output.url} src={output.url} controls playsInline className="w-full rounded-md" />
            ) : (
              // Provider URLs are on other domains, so a plain <img> instead of next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={output.url} src={output.url} alt={job.prompt} className="w-full rounded-md" />
            ),
          )}
          {job.status === "succeeded" && job.outputs[0] && (
            <a href={job.outputs[0].url} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
              Open full size
            </a>
          )}
          {job.status === "succeeded" && job.outputExpiresAt && (
            <p className="text-xs text-muted-foreground">
              Download it before {new Date(job.outputExpiresAt).toLocaleDateString()}: the link expires then.
            </p>
          )}
          {job.status === "failed" && (
            <p className="text-sm text-destructive">
              {job.error ?? "The generation failed."} {job.credits} credits refunded.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
