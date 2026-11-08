"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

import { FormMessage } from "./auth-card";

type Mode = "password" | "link";

export function SignInForm({ next, password, magicLink }: { next: string; password: boolean; magicLink: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(password ? "password" : "link");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!password && !magicLink) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setPending(true);
    setError(null);

    if (mode === "link") {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
      setPending(false);
      if (error) setError(error.message ?? "Couldn't send the link. Try again.");
      else setSentTo(email);
      return;
    }

    const { error } = await authClient.signIn.email({
      email,
      password: String(form.get("password") ?? ""),
      callbackURL: next,
    });
    setPending(false);
    if (!error) {
      router.push(next);
      router.refresh();
    } else if (error.status === 403) {
      setError("Please confirm your email first. We've sent you a new confirmation link.");
    } else {
      setError(error.message ?? "Couldn't sign in. Check your email and password.");
    }
  }

  if (sentTo) {
    return (
      <FormMessage tone="success">
        We sent a sign-in link to <strong>{sentTo}</strong>. It expires in 5 minutes.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode === "password" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" disabled={pending}>
        {pending ? "Please wait…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </Button>
      {password && magicLink && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setMode(mode === "password" ? "link" : "password");
            setError(null);
          }}
        >
          {mode === "password" ? "Email me a sign-in link instead" : "Use a password instead"}
        </Button>
      )}
    </form>
  );
}
