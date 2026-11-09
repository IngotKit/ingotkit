// What can be bought, derived from site.config.ts. Prices and credit amounts live only there.
import { siteConfig } from "@/config/site.config";

export type BillingItem = {
  /** Stable id from site.config.ts; stored on provider products as metadata. */
  id: string;
  kind: "pack" | "plan";
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  /** Credits granted per purchase (pack) or per billing period (plan). */
  credits: number;
  interval?: "month";
};

export function getCatalog(): BillingItem[] {
  const { currency } = siteConfig;
  return [
    ...siteConfig.creditPacks.map(
      (pack): BillingItem => ({
        id: pack.id,
        kind: "pack",
        name: `${pack.name} credit pack`,
        description: `${pack.credits} ${siteConfig.name} credits.`,
        priceCents: pack.priceCents,
        currency,
        credits: pack.credits,
      }),
    ),
    ...siteConfig.plans.map(
      (plan): BillingItem => ({
        id: plan.id,
        kind: "plan",
        name: `${siteConfig.name} ${plan.name}`,
        description: plan.features.join(" · "),
        priceCents: plan.priceCents,
        currency,
        credits: plan.monthlyCredits,
        interval: "month",
      }),
    ),
  ];
}

export function getItem(id: string): BillingItem | undefined {
  return getCatalog().find((item) => item.id === id);
}

export function formatPrice(item: Pick<BillingItem, "priceCents" | "currency">): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency.toUpperCase() }).format(
    item.priceCents / 100,
  );
}
