import { createInvite, expect, respondAsGuest, signUpHost, test } from "./support";

/** `YYYY-MM-DDTHH:00`, `days` from today (negative for the past), as the event form takes it. */
function daysFromNowAt(days: number, hour: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;
}

test("closed RSVPs: the host can reopen, and the guest is told on the first screen", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Book swap");
  await page.goto(`/dashboard/events/${eventId}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Close RSVPs" }).click();

  // The share card says answers are off; nothing pretends new responses can arrive.
  await expect(page.getByRole("heading", { name: "RSVPs are closed" })).toBeVisible();
  await expect(page.getByText("You closed RSVPs.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveCount(0);
  await expect(page.getByText("Updates live")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Email a reminder" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy reminder for non-responders" })).toHaveCount(
    0,
  );

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByText("RSVPs are closed")).toBeInViewport();
  await expect(guest.getByText("RSVPs are closed")).toHaveCount(1);
  await expect(guest.getByRole("radio", { name: "Going" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reopen RSVPs" }).click();
  await expect(page.getByRole("heading", { name: "Share your invite" })).toBeVisible();
  await guest.reload();
  await expect(guest.getByText("RSVPs are closed")).toHaveCount(0);
  await guestContext.close();
});

test("an ended event: duplicate comes first, no cancel, and the invite looks back", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Beach day");
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await respondAsGuest(guest, inviteHref, { name: "Rami" });

  // Move it to yesterday through the real form, so every cache hears about it.
  await page.goto(`/dashboard/events/${eventId}/edit`);
  await page.getByLabel("Starts").fill(daysFromNowAt(-1, 10));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("Ended", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This event has ended" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate for next time" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveCount(0);
  await page.getByRole("button", { name: "More options" }).click();
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Cancel event" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Close RSVPs" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await guest.goto(inviteHref);
  await expect(guest.getByText("This event has ended")).toBeInViewport();
  await expect(guest.getByText("This event has ended")).toHaveCount(1);
  await expect(guest.getByText("1 person was going")).toBeVisible();
  await expect(guest.getByText("You answered: Going")).toBeVisible();
  await expect(guest.getByText("Add to calendar")).toHaveCount(0);
  await expect(guest.getByRole("link", { name: /Open in Maps/ })).toHaveCount(0);
  await guestContext.close();

  // The main button starts the next one.
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}\/edit/);
  expect(page.url()).not.toContain(eventId);
});

test("a cancelled invite says so once and drops what no longer applies", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Karaoke");
  await page.goto(`/dashboard/events/${eventId}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Cancel event" }).click();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByRole("heading", { name: "Let your group know" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy message" })).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code for this invite" })).toHaveCount(0);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByText("This event has been cancelled")).toHaveCount(1);
  await expect(guest.getByRole("link", { name: /Open in Maps/ })).toHaveCount(0);
  await expect(guest.getByText(/going/)).toHaveCount(0);
  await guestContext.close();
});
