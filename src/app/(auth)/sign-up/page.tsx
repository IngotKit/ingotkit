import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard, FormMessage } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Separator } from "@/components/ui/separator";
import { getSignInMethods } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/routing";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <Suspense fallback={<AuthCard title="Create your account">Loading…</AuthCard>}>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpContent({ searchParams }: { searchParams: PageProps<"/sign-up">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  if (await getSession()) redirect(next);

  const methods = getSignInMethods();
  const providers = (["google", "github"] as const).filter((p) => methods[p]);

  return (
    <AuthCard
      title="Create your account"
      footer={
        <span>
          Already have an account?{" "}
          <Link className="underline underline-offset-4" href={`/sign-in?next=${encodeURIComponent(next)}`}>
            Sign in
          </Link>
        </span>
      }
    >
      <SocialButtons providers={[...providers]} next={next} />
      {providers.length > 0 && methods.password && <Separator />}
      {methods.password ? (
        <SignUpForm next={next} />
      ) : (
        providers.length === 0 && (
          <FormMessage tone="error">Sign-up isn&apos;t available until email or a social sign-in is configured.</FormMessage>
        )
      )}
    </AuthCard>
  );
}
