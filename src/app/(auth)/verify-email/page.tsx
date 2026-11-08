import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerificationButton } from "@/components/auth/account-buttons";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Check your email" };

export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  return (
    <Suspense fallback={<AuthCard title="Check your email">Loading…</AuthCard>}>
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({ searchParams }: { searchParams: PageProps<"/verify-email">["searchParams"] }) {
  const email = firstParam((await searchParams).email);
  return (
    <AuthCard
      title="Check your email"
      description={
        email ? (
          <>
            We sent a confirmation link to <strong>{email}</strong>. Click it to finish creating your account.
          </>
        ) : (
          "We sent you a confirmation link. Click it to finish creating your account."
        )
      }
      footer={
        <Link className="underline underline-offset-4" href="/sign-in">
          Back to sign in
        </Link>
      }
    >
      {email && <ResendVerificationButton email={email} />}
    </AuthCard>
  );
}
