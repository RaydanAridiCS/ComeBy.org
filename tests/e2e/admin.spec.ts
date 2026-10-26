import type { Browser } from "@playwright/test";
import { waitForEmail } from "./mailpit";
import { createInvite, expect, signUpHost, test, withDatabase } from "./support";

/**
 * Needs the app started with ADMIN_EMAILS=<E2E_ADMIN_EMAIL>, for example:
 *   ADMIN_EMAILS=e2e-admin@example.com npm start
 *   E2E_ADMIN_EMAIL=e2e-admin@example.com npm run test:e2e
 * CI does both. Without E2E_ADMIN_EMAIL these tests are skipped.
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
// Mailpit keeps old emails between runs, so titles are unique to this run.
const run = Math.random().toString(36).slice(2, 7);

test.skip(!adminEmail, "E2E_ADMIN_EMAIL is not set");
// One shared admin address, so these tests take turns (the mobile project skips them).
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await withDatabase((sql) => sql`DELETE FROM "user" WHERE email = ${adminEmail ?? ""}`);
});

/** Three different visitors report the event, which hides it automatically. */
async function reportUntilHidden(browser: Browser, inviteHref: string) {
  for (let i = 0; i < 3; i++) {
    // Reports count once per network, so each reporter gets their own address.
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `10.99.${i}.${Math.floor(Math.random() * 250) + 1}` },
    });
    const visitor = await context.newPage();
    await visitor.goto(inviteHref);
    // The dialog loads on demand, so retry the click until the page has hydrated.
    await expect(async () => {
      await visitor.getByRole("button", { name: "Report this event" }).click();
      await expect(visitor.getByRole("dialog")).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    await visitor.getByRole("radio", { name: "Scam or phishing" }).click();
    await visitor.getByLabel("Details (optional)").fill("Asks everyone to send money first");
    await visitor.getByRole("button", { name: "Send report" }).click();
    // The report that hides the event re-renders the page into the "under review" view.
    await expect(
      visitor.getByText(/Thanks\. We'll take a look\.|This event is under review/),
    ).toBeVisible();
    await context.close();
  }
}

test("a reported event is hidden, the admin is told, and can restore it", async ({
  page,
  browser,
}) => {
  await signUpHost(page, { email: adminEmail ?? "" });
  const { inviteHref } = await createInvite(page, `Totally legit giveaway ${run}`);

  await reportUntilHidden(browser, inviteHref);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByText("This event is under review")).toBeVisible();

  // The operator gets an email about it.
  const alert = await waitForEmail(
    adminEmail ?? "",
    `Event hidden after reports: Totally legit giveaway ${run}`,
  );
  expect(alert.Text).toContain(`Totally legit giveaway ${run}`);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
  const card = page.getByRole("listitem").filter({ hasText: `Totally legit giveaway ${run}` });
  await expect(card.getByText("Hidden")).toBeVisible();
  await expect(card.getByText("Asks everyone to send money first").first()).toBeVisible();
  await card.getByRole("button", { name: "Restore" }).click();
  await page.getByRole("button", { name: "Restore" }).last().click();
  await expect(page.getByText("Event restored.")).toBeVisible();
  await expect(page.getByText(`restored "Totally legit giveaway ${run}"`)).toBeVisible();

  await guest.reload();
  await expect(guest.getByRole("heading", { name: `Totally legit giveaway ${run}` })).toBeVisible();
  await guestContext.close();
});

test("an admin deletes a reported event for good", async ({ page, browser }) => {
  await signUpHost(page, { email: adminEmail ?? "" });
  const { inviteHref } = await createInvite(page, `Phishing party ${run}`);
  await reportUntilHidden(browser, inviteHref);

  await page.goto("/admin");
  const card = page.getByRole("listitem").filter({ hasText: `Phishing party ${run}` });
  await card.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText("Event deleted.")).toBeVisible();
  await expect(page.getByText(`deleted "Phishing party ${run}"`)).toBeVisible();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await guestContext.close();
});
