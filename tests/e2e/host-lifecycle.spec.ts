import { createInvite, expect, respondAsGuest, signUpHost, test, uniqueEmail } from "./support";

test("host edits an invite and guests see the new details", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Picnic in the park");

  await page.goto(`/dashboard/events/${eventId}/edit`);
  await page.getByLabel("Event name").fill("Picnic by the lake");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByRole("heading", { name: "Picnic by the lake" })).toBeVisible();
  await guestContext.close();
});

test("host cancels an event: guests see it and get an email", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Rooftop party");

  const guestEmail = uniqueEmail("guest");
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await respondAsGuest(guest, inviteHref, { email: guestEmail });

  await page.goto(`/dashboard/events/${eventId}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Cancel event" }).click();
  await page.getByLabel("Message to guests (optional)").fill("Rain, sorry!");
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByText("Event cancelled").first()).toBeVisible();

  await guest.reload();
  await expect(guest.getByText("This event has been cancelled").first()).toBeVisible();
  await guestContext.close();

  const { waitForEmail } = await import("./mailpit");
  const email = await waitForEmail(guestEmail, "Cancelled: Rooftop party");
  expect(email.Text).toContain("Rain, sorry!");
});

test("host duplicates and then deletes an event", async ({ page }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Game night");

  await page.goto(`/dashboard/events/${eventId}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}\/edit/);
  const copyId = page.url().match(/events\/([0-9a-f-]{36})/)?.[1];
  expect(copyId).not.toBe(eventId);

  await page.goto(`/dashboard/events/${eventId}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Delete event" }).click();
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();
});

test("host changes notification settings and they stick", async ({ page }) => {
  await signUpHost(page);
  await page.goto("/dashboard/settings");
  await page.getByRole("radio", { name: /One daily summary/ }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: /One daily summary/ })).toBeChecked();
});

test("host deletes their account and can no longer sign in", async ({ page }) => {
  const { email } = await signUpHost(page);
  await createInvite(page, "Farewell");

  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("textbox").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).last().click();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
});
