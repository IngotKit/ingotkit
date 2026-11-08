import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";

describe("siteConfig", () => {
  it("uses unique ids for packs and plans", () => {
    const ids = [...siteConfig.creditPacks, ...siteConfig.plans].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses positive whole numbers for prices and credits", () => {
    const amounts = [
      ...siteConfig.creditPacks.flatMap((pack) => [pack.credits, pack.priceCents]),
      ...siteConfig.plans.flatMap((plan) => [plan.monthlyCredits, plan.priceCents]),
      ...Object.values(siteConfig.creditCosts),
    ];
    for (const amount of amounts) {
      expect(Number.isInteger(amount) && amount > 0).toBe(true);
    }
    expect(Number.isInteger(siteConfig.signupCredits) && siteConfig.signupCredits >= 0).toBe(true);
  });
});
