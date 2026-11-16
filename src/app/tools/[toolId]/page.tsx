import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobList } from "@/components/tools/job-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { isFakeMediaEnabled } from "@/lib/ai/media";
import { requireSession } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { listJobs } from "@/lib/jobs";
import { toJobView } from "@/lib/jobs/view";
import { isToolAvailable, unavailableMessage } from "@/tools/availability";
import { getTool, tools } from "@/tools/registry";

export async function generateMetadata({ params }: PageProps<"/tools/[toolId]">): Promise<Metadata> {
  const tool = getTool((await params).toolId);
  return { title: tool?.config.name ?? "Tool" };
}

export function generateStaticParams() {
  return tools.map((tool) => ({ toolId: tool.config.id }));
}

export default function ToolPage({ params }: PageProps<"/tools/[toolId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ToolContent params={params} />
      </Suspense>
    </main>
  );
}

async function ToolContent({ params }: { params: PageProps<"/tools/[toolId]">["params"] }) {
  const { toolId } = await params;
  const { user } = await requireSession(`/tools/${toolId}`);
  const tool = getTool(toolId);
  if (!tool) notFound();

  const db = getDb();
  const [balance, jobs, images] = await Promise.all([
    getBalance(db, user.id),
    tool.config.kind === "media" ? listJobs(db, user.id, { toolId, limit: 12 }) : Promise.resolve([]),
    listJobs(db, user.id, { toolId: "image", limit: 12 }),
  ]);
  const available = isToolAvailable(tool);
  const canAfford = balance >= tool.config.credits;
  const now = new Date();
  const recentImages = images
    .filter((j) => j.status === "succeeded" && (!j.outputExpiresAt || j.outputExpiresAt > now))
    .flatMap((j) => {
      const url = j.output?.find((o) => o.kind === "image")?.url;
      return url ? [{ jobId: j.id, url, prompt: String(j.input.prompt ?? "") }] : [];
    });
  const { Form } = tool;

  return (
    <>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{tool.config.name}</h1>
          <p className="text-muted-foreground">{tool.config.description}</p>
        </div>
        <p className="text-lg" data-testid="credit-balance">
          Balance: <strong>{balance}</strong> credits
        </p>
      </header>

      {tool.config.kind === "media" && isFakeMediaEnabled() && (
        <Alert variant="destructive">
          <AlertTitle>Test mode</AlertTitle>
          <AlertDescription>
            FAKE_MEDIA_PROVIDER is on: this tool returns placeholder images. The site owner must remove it before launch.
          </AlertDescription>
        </Alert>
      )}
      {!available && (
        <Alert>
          <AlertTitle>Not available yet</AlertTitle>
          <AlertDescription>{unavailableMessage(tool)}</AlertDescription>
        </Alert>
      )}
      {available && !canAfford && (
        <Alert>
          <AlertTitle>Not enough credits</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            This costs {tool.config.credits} credits and you have {balance}.
            <Link href="/billing" className={buttonVariants({ size: "sm" })}>
              Buy credits
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Form toolId={tool.config.id} credits={tool.config.credits} enabled={available && canAfford} recentImages={recentImages} />

      {tool.config.kind === "media" && (
        <section aria-labelledby="results" className="flex flex-col gap-4">
          <h2 id="results" className="text-lg font-semibold">
            Your recent generations
          </h2>
          <JobList toolId={tool.config.id} initialJobs={jobs.map(toJobView)} />
        </section>
      )}
    </>
  );
}
