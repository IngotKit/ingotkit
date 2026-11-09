import { expect, test } from "@playwright/test";

import { signInWithPassword, signUp } from "./helpers/auth";
import { uniqueEmail, uniqueIp, waitForEmailLink } from "./helpers/mailpit";

// Each test gets its own client IP so Better Auth's rate limiter (on, as in production)
// counts it separately.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test("sign up, verify email, sign out, sign back in", async ({ page }) => {
  const email = uniqueEmail("signup");
  await signUp(page, email);

  // Can't sign in before confirming the email.
  await signInWithPassword(page, email);
  await expect(page.getByText("Please confirm your email first.")).toBeVisible();

  const link = await waitForEmailLink(email, "Confirm your email");
  await page.goto(link);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // Signed out: the dashboard sends us to sign-in.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);

  await signInWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test("sign in with an emailed magic link", async ({ page }) => {
  const email = uniqueEmail("magic");
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Email me a sign-in link instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText(email);

  const link = await waitForEmailLink(email, "Sign in to");
  await page.goto(link);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test("reset a forgotten password", async ({ page }) => {
  const email = uniqueEmail("reset");
  await signUp(page, email);
  await page.goto(await waitForEmailLink(email, "Confirm your email"));
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("reset your password");

  await page.goto(await waitForEmailLink(email, "Reset your"));
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  const newPassword = "another-strong-pass-2";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=1$/);

  await signInWithPassword(page, email, newPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("/setup is hidden on a configured production site", async ({ page }) => {
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/$/);
});
