import { expect, test } from "@playwright/test";

import { E2E_CRON_SECRET } from "../../playwright.config";
import { siteConfig } from "../../src/config/site.config";
import { imageConfig } from "../../src/tools/image/config";
import { orderPaidEvent, signedPolarRequest } from "../helpers/polar-webhooks";
import { signUpVerified } from "./helpers/auth";
import { uniqueIp } from "./helpers/mailpit";

// The configured test server runs with FAKE_MEDIA_PROVIDER=1 (playwright.config.ts): images
// come back as placeholders for free, and a prompt containing "[fail]" fails.

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

const start = siteConfig.signupCredits;
const cost = imageConfig.credits;

test("the dashboard lists the tools", async ({ page }) => {
  await signUpVerified(page, "tools-list");
  for (const name of ["AI chat", "Image generator", "Image to video"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("an image job charges credits; a failed job refunds them", async ({ page }) => {
  await signUpVerified(page, "tools-image");
  await page.goto("/tools/image");
  await expect(page.getByTestId("credit-balance")).toContainText(String(start));

  await page.getByLabel("Describe the image").fill("A lighthouse on a cliff at sunset");
  await page.getByRole("button", { name: `Generate (${cost} credits)` }).click();
  const done = page.locator('[data-testid="job"][data-status="succeeded"]');
  await expect(done).toHaveCount(1, { timeout: 30_000 });
  await expect(done.getByRole("img")).toBeVisible();
  await expect(page.getByTestId("credit-balance")).toContainText(String(start - cost));

  await page.getByLabel("Describe the image").fill("This one should fail [fail]");
  await page.getByRole("button", { name: `Generate (${cost} credits)` }).click();
  const failed = page.locator('[data-testid="job"][data-status="failed"]');
  await expect(failed).toHaveCount(1, { timeout: 30_000 });
  await expect(failed).toContainText(`${cost} credits refunded`);
  await expect(page.getByTestId("credit-balance")).toContainText(String(start - cost));
});

test("a made image can be turned into a video", async ({ page }) => {
  const { userId } = await signUpVerified(page, "tools-video");
  // A video costs more than the sign-up credits: buy a pack with a signed test webhook.
  const order = signedPolarRequest(orderPaidEvent({ userId, itemId: siteConfig.creditPacks[0].id }));
  expect((await page.request.post("/api/webhooks/polar", { data: order.body, headers: order.headers })).status()).toBe(200);

  await page.goto("/tools/image");
  await page.getByLabel("Describe the image").fill("A red bicycle against a white wall");
  await page.getByRole("button", { name: /Generate/ }).click();
  await expect(page.locator('[data-testid="job"][data-status="succeeded"]')).toHaveCount(1, { timeout: 30_000 });

  await page.goto("/tools/image-to-video");
  await page.getByRole("button", { name: "A red bicycle against a white wall" }).click();
  await page.getByLabel("Describe the motion").fill("Slow camera push-in");
  await page.getByRole("button", { name: /Make video/ }).click();
  await expect(page.locator('[data-testid="job"][data-status="succeeded"]')).toHaveCount(1, { timeout: 30_000 });
});

test("signed-out visitors are sent from a tool to sign-in", async ({ page }) => {
  await page.goto("/tools/image");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Ftools%2Fimage$/);
});

test("the cron route needs the secret", async ({ request }) => {
  expect((await request.get("/api/cron/poll-jobs")).status()).toBe(401);
  const wrong = await request.get("/api/cron/poll-jobs", { headers: { Authorization: "Bearer nope" } });
  expect(wrong.status()).toBe(401);
  const ok = await request.get("/api/cron/poll-jobs", { headers: { Authorization: `Bearer ${E2E_CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ ok: true });
});
