import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { formatPrice, getCatalog, getItem } from "@/lib/billing/catalog";

describe("billing catalog", () => {
  it("has one item per credit pack and plan in site.config.ts, with matching credits and prices", () => {
    const catalog = getCatalog();
    expect(catalog).toHaveLength(siteConfig.creditPacks.length + siteConfig.plans.length);
    for (const pack of siteConfig.creditPacks) {
      expect(getItem(pack.id)).toMatchObject({ kind: "pack", credits: pack.credits, priceCents: pack.priceCents });
    }
    for (const plan of siteConfig.plans) {
      expect(getItem(plan.id)).toMatchObject({ kind: "plan", credits: plan.monthlyCredits, interval: "month" });
    }
  });

  it("formats prices from cents", () => {
    expect(formatPrice({ priceCents: 2000, currency: "usd" })).toBe("$20.00");
  });
});
