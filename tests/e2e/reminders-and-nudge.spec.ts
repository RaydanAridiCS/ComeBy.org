import { countEmails, emailHeaders, findLink, waitForEmail } from "./mailpit";
import { createInvite, expect, respondAsGuest, signUpHost, test, uniqueEmail } from "./support";

/*
 * The pre-event reminder is a scheduled sweep (every 15 minutes), so it is covered by unit and
 * integration tests rather than waiting for the clock here. These tests cover what a host sees.
 */

test("a host nudges maybe guests and pasted addresses once", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Garden party");

  const maybeEmail = uniqueEmail("maybe");
  const guestContext = await browser.newContext();
  await respondAsGuest(await guestContext.newPage(), inviteHref, {
    name: "Noor",
    status: "Maybe",
    email: maybeEmail,
  });
  await guestContext.close();

  await page.goto(`/dashboard/events/${eventId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("1 guest answered maybe.")).toBeVisible();

  // A bad address stops the whole list, and nothing is sent.
  await page.getByLabel("Other people to remind (optional)").fill("not-an-email");
  await page.getByRole("button", { name: "Send reminder" }).click();
  await page.getByRole("button", { name: "Send it" }).click();
  await expect(page.getByText("doesn't look like an email address")).toBeVisible();

  const inviteeEmail = uniqueEmail("invitee");
  await page.getByLabel("Other people to remind (optional)").fill(`${inviteeEmail}, ${maybeEmail}`);
  await page.getByRole("button", { name: "Send reminder" }).click();
  await page.getByRole("button", { name: "Send it" }).click();
  await expect(page.getByText("Reminder on its way")).toBeVisible();

  const toMaybe = await waitForEmail(maybeEmail, "Can you make it to Garden party?");
  const toInvitee = await waitForEmail(inviteeEmail, "Can you make it to Garden party?");
  expect(findLink(toInvitee, "/unsubscribe?t=")).toContain("guest.");
  const headers = await emailHeaders(toMaybe);
  expect(headers["List-Unsubscribe"]?.[0]).toMatch(/\/api\/unsubscribe\?t=guest\./);

  // The maybe guest was in the pasted list too, but gets a single email.
  expect(await countEmails(maybeEmail, "Can you make it to")).toBe(1);

  // It can't be sent twice, and the timeline records it.
  await page.reload();
  await expect(page.getByText("You've already sent the reminder for this event.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reminder" })).toHaveCount(0);
  await expect(page.getByText("Reminder emailed to 2 people")).toBeVisible();
});

test("the reminder switch is saved with the event", async ({ page }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Board games");

  await page.goto(`/dashboard/events/${eventId}/edit`);
  await page.waitForLoadState("networkidle");
  await page.getByText("What guests are asked").click();
  const reminder = page.getByRole("switch", { name: /Email a reminder the day before/ });
  await expect(reminder).toBeChecked();
  await reminder.click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page.goto(`/dashboard/events/${eventId}/edit`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("No reminder email")).toBeVisible();
  await page.getByText("What guests are asked").click();
  await expect(
    page.getByRole("switch", { name: /Email a reminder the day before/ }),
  ).not.toBeChecked();
});
