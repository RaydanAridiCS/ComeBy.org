import { expect, test } from "@playwright/test";
import { findLink, waitForEmail } from "./mailpit";

function tomorrowAt(hour: number): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;
}

test("host creates an invite, a guest responds, the host sees it", async ({ page, browser }) => {
  const email = `host-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

  // 1. Sign up and confirm the email address.
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Lina");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  const verification = await waitForEmail(email, "Confirm your email");
  await page.goto(findLink(verification, "verify-email"));
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Create an event.
  await page.goto("/dashboard/events/new");
  await page.getByLabel("Event name").fill("Picnic in the park");
  await page.getByLabel("Starts").fill(tomorrowAt(16));
  await page.getByLabel("Place name").fill("Central Park");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: "Picnic in the park" })).toBeVisible();

  const inviteHref = await page.getByRole("link", { name: "View invite" }).getAttribute("href");
  expect(inviteHref).toMatch(/^\/[a-z0-9-]+$/);

  // 3. A guest (no account, separate browser) responds.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref ?? "/");
  await expect(guest.getByRole("heading", { name: "Picnic in the park" })).toBeVisible();
  await guest.getByRole("radio", { name: "Going" }).click();
  await guest.getByLabel("Your name").fill("Omar");
  await guest.getByLabel(/Message to the host/).fill("Count me in!");
  await guest.getByRole("button", { name: "Send response" }).click();
  await expect(guest.getByText("You're in!")).toBeVisible();

  // The guest's browser remembers their response.
  await guest.reload();
  await expect(guest.getByText("Your response: Going")).toBeVisible();
  await guestContext.close();

  // 4. The host sees the response and the activity.
  await page.reload();
  await expect(page.getByText("Omar").first()).toBeVisible();
  await expect(page.getByText("“Count me in!”")).toBeVisible();
  await expect(page.getByText("Omar responded Going")).toBeVisible();
});

test("unknown invite links show a friendly not-found page", async ({ page }) => {
  await page.goto("/this-invite-does-not-exist-123");
  await expect(page.getByText("Invite not found")).toBeVisible();
});
