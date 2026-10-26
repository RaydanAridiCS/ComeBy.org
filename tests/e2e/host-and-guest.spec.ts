import { createInvite, expect, signUpHost, test } from "./support";

test("host creates an invite, a guest responds, the host sees it", async ({ page, browser }) => {
  await signUpHost(page);
  const { inviteHref } = await createInvite(page);
  await expect(page.getByRole("heading", { name: "Picnic in the park" })).toBeVisible();
  expect(inviteHref).toMatch(/^\/[a-z0-9-]+$/);

  // A guest (no account, separate browser) responds.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
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

  // The host sees the response and the activity.
  await page.reload();
  await expect(page.getByText("Omar").first()).toBeVisible();
  await expect(page.getByText("“Count me in!”")).toBeVisible();
  await expect(page.getByText("Omar responded Going")).toBeVisible();
});

test("unknown invite links show a friendly not-found page", async ({ page }) => {
  await page.goto("/this-invite-does-not-exist-123");
  await expect(page.getByText("Invite not found")).toBeVisible();
});
