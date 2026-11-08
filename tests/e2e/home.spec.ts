import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site.config";

test("home page renders the product name from site.config", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteConfig.name);
  await expect(page).toHaveTitle(siteConfig.name);
});
