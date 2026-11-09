import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Thank you" };

// Credits are added by the payment provider's webhook, usually within seconds, so this page
// doesn't try to grant anything itself.
export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Thank you!</h1>
      <p className="text-muted-foreground">
        Your payment went through. Your credits usually appear within a few seconds. If they
        don&apos;t show up yet, refresh the billing page in a minute.
      </p>
      <Link href="/billing" className={buttonVariants()}>
        Go to billing
      </Link>
    </main>
  );
}
