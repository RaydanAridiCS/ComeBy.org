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

test("after creating, the host is offered the link to share, once", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signUpHost(page);
  const { inviteHref } = await createInvite(page);
  await expect(page).toHaveURL(/created=1/);

  const panel = page.getByRole("region", { name: "Your invite is ready" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\?text=/,
  );
  await expect(panel.getByRole("link", { name: "View invite" })).toHaveAttribute(
    "href",
    inviteHref,
  );

  // Copying works, and sharing forgets the marker: the panel stays for now but won't come back.
  await panel.getByRole("button", { name: "Copy link" }).click();
  await expect(panel.getByText("Copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(inviteHref);
  await expect(page).not.toHaveURL(/created/);
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Picnic in the park" })).toBeVisible();
  await expect(panel).toBeHidden();
});

test("dismissing the ready panel without sharing also keeps it from coming back", async ({
  page,
}) => {
  await signUpHost(page);
  await createInvite(page);
  const panel = page.getByRole("region", { name: "Your invite is ready" });
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toBeHidden();
  await expect(page).not.toHaveURL(/created/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Picnic in the park" })).toBeVisible();
  await expect(panel).toBeHidden();
});

test("unknown invite links show a friendly not-found page", async ({ page }) => {
  await page.goto("/this-invite-does-not-exist-123");
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await expect(page.getByText("Double-check the link with whoever sent it.")).toBeVisible();
  await expect(page).toHaveTitle(/Invite not found/);
  // A guest with a dead link isn't pushed to sign up.
  await expect(page.getByRole("link", { name: "Create an event" })).toHaveCount(0);
});

test("addresses that can't be an invite say the page is missing, not the invite", async ({
  page,
}) => {
  // Two segments: no route at all. A reserved word and a file name: never an invite link.
  for (const path of ["/some/unknown/path", "/about", "/wp-login.php"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("Invite not found")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
  }
});

test("a broken private link explains itself instead of opening the home page", async ({ page }) => {
  // Malformed, and well-formed but unknown: the same answer either way.
  for (const link of ["/r/nonsense", "/r/0198a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b.not-the-secret"]) {
    await page.goto(link);
    await expect(page).toHaveURL(/\/r\/invalid$/);
    await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
    await expect(page.getByText("open the invite you were sent")).toBeVisible();
  }
});
