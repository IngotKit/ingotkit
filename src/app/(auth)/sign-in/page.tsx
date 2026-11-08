import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard, FormMessage } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Separator } from "@/components/ui/separator";
import { getSignInMethods } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/routing";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={<AuthCard title="Sign in">Loading…</AuthCard>}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInContent({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  if (await getSession()) redirect(next);

  const methods = getSignInMethods();
  const providers = (["google", "github"] as const).filter((p) => methods[p]);
  const hasEmail = methods.password || methods.magicLink;

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back."
      footer={
        methods.password ? (
          <span>
            No account yet?{" "}
            <Link className="underline underline-offset-4" href={`/sign-up?next=${encodeURIComponent(next)}`}>
              Create one
            </Link>
          </span>
        ) : undefined
      }
    >
      {firstParam(params.reset) && <FormMessage tone="success">Password updated. Sign in with your new password.</FormMessage>}
      <SocialButtons providers={[...providers]} next={next} />
      {providers.length > 0 && hasEmail && <Separator />}
      <SignInForm next={next} password={methods.password} magicLink={methods.magicLink} />
      {!hasEmail && providers.length === 0 && (
        <FormMessage tone="error">No sign-in method is configured yet. See the setup page.</FormMessage>
      )}
    </AuthCard>
  );
}
