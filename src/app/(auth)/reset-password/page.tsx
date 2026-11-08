import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard, FormMessage } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<AuthCard title="Choose a new password">Loading…</AuthCard>}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const invalid = firstParam(params.error) === "INVALID_TOKEN" || !token;

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link className="underline underline-offset-4" href="/forgot-password">
          Request a new link
        </Link>
      }
    >
      {invalid ? (
        <FormMessage tone="error">This reset link is invalid or has expired. Request a new one.</FormMessage>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthCard>
  );
}
