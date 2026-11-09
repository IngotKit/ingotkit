import { expect, type Page } from "@playwright/test";

import { uniqueEmail, waitForEmailLink } from "./mailpit";

export const PASSWORD = "correct-horse-battery-1";

export async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
}

export async function signInWithPassword(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** Signs up a fresh user, confirms the email, and ends on the dashboard signed in. */
export async function signUpVerified(page: Page, label: string): Promise<{ email: string; userId: string }> {
  const email = uniqueEmail(label);
  await signUp(page, email);
  await page.goto(await waitForEmailLink(email, "Confirm your email"));
  await expect(page).toHaveURL(/\/dashboard$/);
  const session = await (await page.request.get("/api/auth/get-session")).json();
  return { email, userId: session.user.id as string };
}
