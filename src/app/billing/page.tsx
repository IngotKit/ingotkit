import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { formatPrice, getBillingProvider, getCatalog } from "@/lib/billing";
import { requireSession } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { firstParam } from "@/lib/search-params";

import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Credits & billing" };

const ERRORS: Record<string, string> = {
  "not-configured": "Payments aren't set up yet. Add the Polar (or Stripe) settings shown on the setup page.",
  "not-synced": "The products haven't been created in the payment provider yet. Run `npm run billing:sync`.",
  "no-customer": "There's no billing account yet. It's created with your first purchase.",
  "unknown-item": "That product doesn't exist.",
  "provider-error": "The payment provider didn't respond as expected. Please try again in a moment.",
};

export default function BillingPage({ searchParams }: PageProps<"/billing">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <BillingContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BillingContent({ searchParams }: { searchParams: PageProps<"/billing">["searchParams"] }) {
  const { user } = await requireSession("/billing");
  const error = firstParam((await searchParams).error);
  const balance = await getBalance(getDb(), user.id);
  const provider = getBillingProvider();
  const catalog = getCatalog();
  const packs = catalog.filter((item) => item.kind === "pack");
  const plans = catalog.filter((item) => item.kind === "plan");

  return (
    <>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Credits &amp; billing</h1>
        </div>
        <p className="text-lg" data-testid="credit-balance">
          Balance: <strong>{balance}</strong> credits
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{ERRORS[error] ?? ERRORS["provider-error"]}</AlertDescription>
        </Alert>
      )}
      {!provider && (
        <Alert>
          <AlertTitle>Payments aren&apos;t set up yet</AlertTitle>
          <AlertDescription>Buying is turned off until Polar or Stripe is configured.</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="packs" className="flex flex-col gap-4">
        <h2 id="packs" className="text-lg font-semibold">
          Credit packs
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {packs.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {item.name.replace(" credit pack", "")}
                  {siteConfig.creditPacks.find((p) => p.id === item.id)?.highlight && <Badge>Popular</Badge>}
                </CardTitle>
                <CardDescription>{item.credits} credits</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatPrice(item)}</CardContent>
              <CardFooter>
                <form action={startCheckout} className="w-full">
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button type="submit" className="w-full" disabled={!provider}>
                    Buy {item.credits} credits
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section aria-labelledby="plans" className="flex flex-col gap-4">
          <h2 id="plans" className="text-lg font-semibold">
            Monthly plan
          </h2>
          {plans.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>
                  {formatPrice(item)}/month · {item.credits} credits every month. Unused credits carry over.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <form action={startCheckout}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button type="submit" disabled={!provider}>
                    Subscribe
                  </Button>
                </form>
                <form action={openBillingPortal}>
                  <Button type="submit" variant="outline" disabled={!provider}>
                    Manage subscription &amp; invoices
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}
