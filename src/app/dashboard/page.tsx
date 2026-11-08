import type { Metadata } from "next";
import { Suspense } from "react";

import Link from "next/link";

import { SignOutButton } from "@/components/auth/account-buttons";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { requireSession } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder app home. Credits, tools and the gallery arrive in Phases 3 to 5.
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
        Signed in as <strong className="text-foreground">{user.email}</strong>. Your {siteConfig.name} tools will appear here.
      </p>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <p data-testid="credit-balance">
          <strong className="text-2xl">{balance}</strong> credits
        </p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Buy credits
        </Link>
      </div>
    </>
  );
}
