"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

import { FormMessage } from "./auth-card";

export function ResendVerificationButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={state === "sending" || state === "sent"} onClick={resend}>
        {state === "sent" ? "Sent. Check your inbox." : state === "sending" ? "Sending…" : "Resend the email"}
      </Button>
      {state === "error" && <FormMessage tone="error">Couldn&apos;t resend right now. Try again in a minute.</FormMessage>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
