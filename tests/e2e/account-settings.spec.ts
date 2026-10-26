import type { Page } from "@playwright/test";
import { findLink, waitForEmail } from "./mailpit";
import { createInvite, expect, signUpHost, test, uniqueEmail } from "./support";

const PASSWORD = "correct-horse-battery";

/** A fresh fake client address, so rate limits that persist in the database never carry over between runs. */
const randomIp = () => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
};

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Another browser (its own cookies and fake network address) for the same host. */
async function otherDevice(browser: import("@playwright/test").Browser, ip: string, email: string) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

test("a host changes their password and other devices are signed out", async ({
  page,
  browser,
}) => {
  const { email } = await signUpHost(page);
  const other = await otherDevice(browser, randomIp(), email);

  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password").fill("a-brand-new-passphrase");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("That isn't your current password.")).toBeVisible();

  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();

  // The other device lost its session; this one stays signed in.
  await other.page.goto("/dashboard");
  await expect(other.page).toHaveURL(/\/login/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  // Only the new password works from now on.
  await other.page.goto("/login");
  await other.page.waitForLoadState("networkidle");
  await other.page.getByLabel("Email").fill(email);
  await other.page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await other.page.getByRole("button", { name: "Sign in" }).click();
  await expect(other.page.getByText("That email and password don't match.")).toBeVisible();
  await other.page.getByLabel("Password", { exact: true }).fill("a-brand-new-passphrase");
  await other.page.getByRole("button", { name: "Sign in" }).click();
  await expect(other.page).toHaveURL(/\/dashboard/);
  await other.context.close();
});

test("a host sees their sessions and signs out one device", async ({ page, browser }) => {
  const { email } = await signUpHost(page);
  const other = await otherDevice(browser, randomIp(), email);
  const rows = page.getByRole("listitem").filter({ hasText: "Last active" });

  await page.goto("/dashboard/settings");
  await expect(page.getByText("This device", { exact: true })).toBeVisible();
  await expect(rows).toHaveCount(2);

  await page
    .getByRole("button", { name: /^Sign out / })
    .first()
    .click();
  await expect(page.getByText("Device signed out")).toBeVisible();
  await expect(rows).toHaveCount(1);

  await other.page.goto("/dashboard");
  await expect(other.page).toHaveURL(/\/login/);
  await other.context.close();
});

test("a host signs out everywhere else in one click", async ({ page, browser }) => {
  const { email } = await signUpHost(page);
  const devices = [
    await otherDevice(browser, randomIp(), email),
    await otherDevice(browser, randomIp(), email),
  ];

  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: "Sign out everywhere else" }).click();
  await expect(page.getByText("Signed out everywhere else")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out everywhere else" })).toBeHidden();
  for (const device of devices) {
    await device.page.goto("/dashboard");
    await expect(device.page).toHaveURL(/\/login/);
    await device.context.close();
  }
});

test("a host changes their email in two confirmed steps", async ({ page }) => {
  const { email } = await signUpHost(page);
  const newEmail = uniqueEmail("new");

  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Change email").fill(newEmail);
  await page.getByRole("button", { name: "Send approval email" }).click();
  await expect(page.getByText(/we sent a link to approve the change/)).toBeVisible();

  // Step 1: the current address approves.
  const approval = await waitForEmail(email, "Approve your new Comeby email");
  await page.goto(findLink(approval, "verify-email"));

  // Step 2: the new address confirms.
  const confirmation = await waitForEmail(newEmail, "Confirm your email");
  await page.goto(findLink(confirmation, "verify-email"));

  await page.goto("/dashboard/settings");
  await expect(page.getByText(`You sign in with ${newEmail}`)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, newEmail);
});

test("a host renames themselves and downloads only their own data", async ({ page, browser }) => {
  await signUpHost(page, { name: "Lina" });
  await createInvite(page, "Lina's picnic");

  // Another host with their own event; none of it may leak into Lina's export.
  const stranger = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": randomIp() },
  });
  const strangerPage = await stranger.newPage();
  await signUpHost(strangerPage, { name: "Karim" });
  await createInvite(strangerPage, "Karim's secret dinner");
  await stranger.close();

  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name", { exact: true }).fill("Lina Renamed");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name saved")).toBeVisible();

  const response = await page.context().request.get("/api/account/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const data = await response.json();
  expect(data.profile.name).toBe("Lina Renamed");
  expect(data.events.map((event: { title: string }) => event.title)).toEqual(["Lina's picnic"]);
  expect(JSON.stringify(data)).not.toContain("Karim");
});

test("the account export needs a signed-in host", async ({ request }) => {
  expect((await request.get("/api/account/export")).status()).toBe(401);
});

test("an unconfirmed host can ask for the confirmation email again", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill("Lina");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // Right after signing up, the button waits out a cooldown.
  await expect(page.getByRole("button", { name: /Send again in \d+s/ })).toBeDisabled();

  // Trying to sign in before confirming offers the same button.
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Please confirm your email first.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Send again in \d+s/ })).toBeVisible();
});

test("auth forms are marked method=post, so a plain submit never puts a password in the URL", async ({
  page,
}) => {
  for (const path of ["/login", "/signup", "/forgot-password"]) {
    await page.goto(path);
    await expect(page.locator("form").first()).toHaveAttribute("method", "post");
  }
});
