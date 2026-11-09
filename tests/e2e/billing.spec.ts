import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site.config";
import { orderPaidEvent, signedPolarRequest } from "../helpers/polar-webhooks";
import { signUpVerified } from "./helpers/auth";
import { uniqueIp } from "./helpers/mailpit";

// The configured test server uses a test Polar webhook secret (playwright.config.ts), so these
// requests pass the same signature check real Polar webhooks do. No real Polar API is called.

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

const pack = siteConfig.creditPacks[0];

test("a paid order adds credits once; a replay or forgery adds none", async ({ page }) => {
  const { userId } = await signUpVerified(page, "billing");

  // New accounts start with the sign-up credits.
  await expect(page.getByTestId("credit-balance")).toContainText(String(siteConfig.signupCredits));

  const order = signedPolarRequest(orderPaidEvent({ userId, itemId: pack.id }));
  const first = await page.request.post("/api/webhooks/polar", { data: order.body, headers: order.headers });
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ duplicate: false, creditsGranted: pack.credits });

  const expected = String(siteConfig.signupCredits + pack.credits);
  await page.goto("/billing");
  await expect(page.getByTestId("credit-balance")).toContainText(expected);

  // Polar retries deliveries; the same event must not grant again.
  const replay = await page.request.post("/api/webhooks/polar", { data: order.body, headers: order.headers });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toMatchObject({ duplicate: true, creditsGranted: 0 });

  // Signed with the wrong secret: rejected.
  const forged = signedPolarRequest(
    orderPaidEvent({ userId, itemId: pack.id }),
    `whsec_${Buffer.from("attacker-secret").toString("base64")}`,
  );
  const rejected = await page.request.post("/api/webhooks/polar", { data: forged.body, headers: forged.headers });
  expect(rejected.status()).toBe(401);

  await page.reload();
  await expect(page.getByTestId("credit-balance")).toContainText(expected);
});

test("the billing page lists the packs and plan from site.config.ts", async ({ page }) => {
  await signUpVerified(page, "billing-page");
  await page.goto("/billing");
  for (const p of siteConfig.creditPacks) {
    await expect(page.getByRole("button", { name: `Buy ${p.credits} credits` })).toBeEnabled();
  }
  await expect(page.getByRole("button", { name: "Subscribe" })).toBeEnabled();
});

test("signed-out visitors are sent from /billing to sign-in", async ({ page }) => {
  await page.goto("/billing");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fbilling$/);
});
