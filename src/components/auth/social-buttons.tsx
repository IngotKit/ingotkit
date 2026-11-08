"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

import { FormMessage } from "./auth-card";

type Provider = "google" | "github";

const LABELS: Record<Provider, string> = { google: "Continue with Google", github: "Continue with GitHub" };

export function SocialButtons({ providers, next }: { providers: Provider[]; next: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: next });
    if (error) {
      setError(error.message ?? "Couldn't start sign-in. Try again.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => signIn(provider)}
        >
          {pending === provider ? "Redirecting…" : LABELS[provider]}
        </Button>
      ))}
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  );
}
