"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  BillingNotConfiguredError,
  NoBillingCustomerError,
  ProductNotSyncedError,
  getBillingProvider,
  getItem,
} from "@/lib/billing";
import { requireSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";

const checkoutInput = z.object({ itemId: z.string().min(1).max(64) });

function appUrl(path: string): string {
  return new URL(path, getEnv().APP_URL).toString();
}

function errorCode(error: unknown): string {
  if (error instanceof BillingNotConfiguredError) return "not-configured";
  if (error instanceof ProductNotSyncedError) return "not-synced";
  if (error instanceof NoBillingCustomerError) return "no-customer";
  console.error("[billing]", error);
  return "provider-error";
}

/** Sends the signed-in user to the provider's hosted checkout for a pack or the plan. */
export async function startCheckout(formData: FormData): Promise<void> {
  const { user } = await requireSession("/billing");
  const parsed = checkoutInput.safeParse({ itemId: formData.get("itemId") });
  const item = parsed.success ? getItem(parsed.data.itemId) : undefined;
  if (!item) redirect("/billing?error=unknown-item");

  let url: string;
  try {
    const provider = getBillingProvider();
    if (!provider) throw new BillingNotConfiguredError();
    ({ url } = await provider.createCheckout({
      item,
      user: { id: user.id, email: user.email, name: user.name },
      successUrl: appUrl("/billing/success"),
      cancelUrl: appUrl("/billing"),
    }));
  } catch (error) {
    redirect(`/billing?error=${errorCode(error)}`);
  }
  redirect(url);
}

/** Opens the provider's customer portal (invoices, payment method, cancel the plan). */
export async function openBillingPortal(): Promise<void> {
  const { user } = await requireSession("/billing");
  let url: string;
  try {
    const provider = getBillingProvider();
    if (!provider) throw new BillingNotConfiguredError();
    url = await provider.createPortalUrl({ userId: user.id, returnUrl: appUrl("/billing") });
  } catch (error) {
    redirect(`/billing?error=${errorCode(error)}`);
  }
  redirect(url);
}
