import type { Metadata } from "next";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/account-buttons";
import { siteConfig } from "@/config/site.config";
import { requireSession } from "@/lib/auth/session";

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
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">
        Signed in as <strong className="text-foreground">{user.email}</strong>. Your {siteConfig.name} tools will appear here.
      </p>
    </>
  );
}
