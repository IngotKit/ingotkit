"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Fired after a job starts, so the job list on the page refreshes straight away. */
export const JOB_STARTED_EVENT = "ingotkit:job-started";

/** Posts a media tool's form to /api/tools/<id> and reports errors in plain words. */
export function useMediaSubmit(toolId: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/${toolId}`, { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { error?: string; job?: { status: string; error?: string } };
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return false;
      }
      if (body.job?.status === "failed") setError(body.job.error ?? "The generation couldn't start. Your credits were refunded.");
      window.dispatchEvent(new Event(JOB_STARTED_EVENT));
      return body.job?.status !== "failed";
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return { submit, pending, error };
}
