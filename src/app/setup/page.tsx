import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { isFakeMediaEnabled } from "@/lib/ai/media";
import { readEnv } from "@/lib/env";
import {
  checkDatabase,
  describeFeatures,
  type DatabaseStatus,
  type FeatureState,
  type VarState,
} from "@/lib/setup/status";

export const metadata: Metadata = { title: "Setup", robots: { index: false } };

export default function SetupPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">{siteConfig.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Setup</h1>
        <p className="text-muted-foreground text-pretty">
          Settings are environment variables. Locally, copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and restart <code>npm run dev</code>. On Hostinger, add them to your
          app&apos;s environment variables in hPanel and redeploy. Values are never shown here, only
          whether each one is set.
        </p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Checking your configuration…</p>}>
        <SetupStatus />
      </Suspense>
    </main>
  );
}

async function SetupStatus() {
  // Read settings per request, never at build time.
  await connection();
  const report = readEnv();
  const features = describeFeatures(report);
  const database = await checkDatabase(report);
  const allReady = report.coreReady && database.state === "ready";

  return (
    <div className="flex flex-col gap-8">
      {allReady ? (
        <Alert>
          <AlertTitle>Core setup is complete</AlertTitle>
          <AlertDescription>
            The app is running. Optional features below switch on as you add their settings.
            <Link className={buttonVariants({ size: "sm", className: "mt-3 w-fit" })} href="/sign-up">
              Create your account
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Setup needed</AlertTitle>
          <AlertDescription>
            {report.coreReady
              ? "Core settings are in place. Finish the database step below."
              : "Add the missing Core settings below. The app shows this page until they are set."}
          </AlertDescription>
        </Alert>
      )}

      {isFakeMediaEnabled() && (
        <Alert variant="destructive">
          <AlertTitle>Test media provider is on</AlertTitle>
          <AlertDescription>
            FAKE_MEDIA_PROVIDER=1 replaces Higgsfield with placeholder images for automated tests. Remove it before
            real users sign up, or they will pay credits for placeholders.
          </AlertDescription>
        </Alert>
      )}

      <DatabaseSection status={database} />

      {features.map((feature) => (
        <section key={feature.feature} aria-labelledby={`feature-${feature.feature}`} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 id={`feature-${feature.feature}`} className="text-lg font-semibold">
              {feature.label}
            </h2>
            <FeatureBadge state={feature.state} />
          </div>
          <p className="text-sm text-muted-foreground">{feature.enables}</p>
          <ul className="flex flex-col divide-y rounded-lg border">
            {feature.vars.map((v) => (
              <li key={v.key} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <code className="font-mono font-medium">{v.key}</code>
                  <span className="text-muted-foreground">{v.help}</span>
                  {v.message && <span className="text-destructive">Invalid: {v.message}</span>}
                  {v.value && <span className="truncate text-muted-foreground">Current: {v.value}</span>}
                </div>
                <VarBadge state={v.state} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DatabaseSection({ status }: { status: DatabaseStatus }) {
  const text: Record<DatabaseStatus["state"], string> = {
    "not-configured": "Set DATABASE_URL first.",
    unreachable: "Can't connect with DATABASE_URL. Check the host, user, password and database name.",
    "needs-migration": "Connected. Create the tables by running `npm run db:migrate`.",
    ready: "Connected, and the tables exist.",
  };
  return (
    <section aria-labelledby="database" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 id="database" className="text-lg font-semibold">
          Database
        </h2>
        <Badge variant={status.state === "ready" ? "default" : "destructive"}>
          {status.state === "ready" ? "Ready" : "Action needed"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{text[status.state]}</p>
      {status.state === "unreachable" && (
        <p className="font-mono text-xs break-all text-destructive">{status.error}</p>
      )}
      {status.state === "needs-migration" && (
        <p className="text-sm text-muted-foreground">Missing tables: {status.missingTables.join(", ")}</p>
      )}
    </section>
  );
}

function FeatureBadge({ state }: { state: FeatureState }) {
  const map: Record<FeatureState, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ready: { label: "Ready", variant: "default" },
    partial: { label: "Incomplete", variant: "destructive" },
    invalid: { label: "Invalid value", variant: "destructive" },
    missing: { label: "Not configured", variant: "outline" },
  };
  return <Badge variant={map[state].variant}>{map[state].label}</Badge>;
}

function VarBadge({ state }: { state: VarState }) {
  const map: Record<VarState, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    set: { label: "Set", variant: "secondary" },
    missing: { label: "Missing", variant: "outline" },
    optional: { label: "Optional", variant: "outline" },
    invalid: { label: "Invalid", variant: "destructive" },
  };
  return (
    <Badge className="shrink-0" variant={map[state].variant}>
      {map[state].label}
    </Badge>
  );
}
