// Picks the payment provider from site.config.ts and the configured env. Nothing outside
// src/lib/billing imports a payment SDK.
import { and, eq } from "drizzle-orm";

import { siteConfig } from "@/config/site.config";
import { getDb } from "@/db/client";
import { billingCustomer } from "@/db/schema";
import { getEnv, isFeatureReady, readEnv } from "@/lib/env";

import { createPolarProvider } from "./polar";
import { createStripeProvider } from "./stripe";
import type { BillingProvider, ProviderName } from "./types";

export { formatPrice, getCatalog, getItem, type BillingItem } from "./catalog";
export * from "./types";

/** Providers whose settings are complete, in preference order. */
export function configuredProviders(): ProviderName[] {
  const report = readEnv();
  return (["polar", "stripe"] as const).filter((name) => isFeatureReady(name, report));
}

/** A specific provider, if its settings are complete (webhook routes use this). */
export function getProviderByName(name: string): BillingProvider | null {
  if (!configuredProviders().includes(name as ProviderName)) return null;
  const env = getEnv();
  if (name === "polar") {
    return createPolarProvider({
      accessToken: env.POLAR_ACCESS_TOKEN!,
      webhookSecret: env.POLAR_WEBHOOK_SECRET!,
      server: env.POLAR_SERVER === "production" ? "production" : "sandbox",
    });
  }
  return createStripeProvider({
    secretKey: env.STRIPE_SECRET_KEY!,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET!,
    findCustomerId: async (userId) => {
      const [row] = await getDb()
        .select({ customerId: billingCustomer.customerId })
        .from(billingCustomer)
        .where(and(eq(billingCustomer.userId, userId), eq(billingCustomer.provider, "stripe")));
      return row?.customerId;
    },
  });
}

/** The provider that takes payments (site.config.ts `billing.provider`), or null if none is set up. */
export function getBillingProvider(): BillingProvider | null {
  const choice = siteConfig.billing.provider;
  const name = choice === "auto" ? configuredProviders()[0] : choice;
  return name ? getProviderByName(name) : null;
}
