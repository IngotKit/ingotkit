import { expect, test } from "@playwright/test";

// Runs against the server started with every setting blank: a fresh fork with no env.

test("every page redirects to /setup when core settings are missing", async ({ page }) => {
  for (const path of ["/", "/dashboard", "/sign-in"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/setup$/);
  }
});

test("/setup lists the missing core settings without crashing", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { level: 1, name: "Setup" })).toBeVisible();
  await expect(page.getByText("Setup needed")).toBeVisible();

  const core = page.locator("section", { has: page.getByRole("heading", { name: "Core" }) });
  for (const key of ["DATABASE_URL", "APP_URL", "BETTER_AUTH_SECRET"]) {
    const row = core.locator("li", { hasText: key });
    await expect(row).toContainText("Missing");
  }
  await expect(page.getByText("Set DATABASE_URL first.")).toBeVisible();
});

test("the auth API answers 503 instead of crashing", async ({ request }) => {
  const res = await request.get("/api/auth/ok");
  expect(res.status()).toBe(503);
});
