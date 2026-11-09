import type { Metadata } from "next";
import { Suspense } from "react";

import Link from "next/link";

import { SignOutButton } from "@/components/auth/account-buttons";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { requireSession } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { isToolAvailable } from "@/tools/availability";
import { tools } from "@/tools/registry";

export const metadata: Metadata = { title: "Dashboard" };

// App home: balance and the AI tools. The gallery arrives in Phase 5.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const { user } = await requireSession("/dashboard");
  const balance = await getBalance(getDb(), user.id);
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">
        Signed in as <strong className="text-foreground">{user.email}</strong>. Welcome to {siteConfig.name}.
      </p>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <p data-testid="credit-balance">
          <strong className="text-2xl">{balance}</strong> credits
        </p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Buy credits
        </Link>
      </div>
      <section aria-labelledby="tools" className="flex flex-col gap-4">
        <h2 id="tools" className="text-lg font-semibold">
          Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.config.id} href={`/tools/${tool.config.id}`} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{tool.config.name}</CardTitle>
                  <CardDescription>{tool.config.description}</CardDescription>
                  <p className="text-xs text-muted-foreground">
                    {isToolAvailable(tool) ? `${tool.config.credits} credit${tool.config.credits === 1 ? "" : "s"} per use` : "Not set up yet"}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
