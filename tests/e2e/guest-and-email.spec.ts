import { countEmails, emailHeaders, findLink, waitForEmail } from "./mailpit";
import {
  createInvite,
  expect,
  respondAsGuest,
  signUpHost,
  test,
  tomorrowAt,
  uniqueEmail,
} from "./support";

test("a guest changes their response from the emailed link", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Book club");

  const guestEmail = uniqueEmail("guest");
  const first = await browser.newContext();
  await respondAsGuest(await first.newPage(), inviteHref, { name: "Omar", email: guestEmail });
  await first.close();

  // On another device the emailed link restores the response, so they can change it.
  const confirmation = await waitForEmail(guestEmail, "Book club");
  const editLink = findLink(confirmation, "/r/");
  const second = await browser.newContext();
  const guest = await second.newPage();
  await guest.goto(editLink);
  await expect(guest.getByText("Your response: Going")).toBeVisible();
  await guest.getByRole("button", { name: "Change my response" }).click();
  await guest.getByRole("radio", { name: "Can't go" }).click();
  await guest.getByRole("button", { name: "Update response" }).click();
  await expect(guest.getByText("Thanks for letting them know")).toBeVisible();
  await second.close();

  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("Omar").first()).toBeVisible();
  await expect(
    page.getByText(/Omar changed .*Going.*Can't go|Omar responded Can't go/),
  ).toBeVisible();
});

test("a guest can unsubscribe from update emails, and sees a one-click header", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Dinner party");

  const guestEmail = uniqueEmail("guest");
  const guestContext = await browser.newContext();
  await respondAsGuest(await guestContext.newPage(), inviteHref, { email: guestEmail });

  const editEvent = async (hour: number) => {
    await page.goto(`/dashboard/events/${eventId}/edit`);
    await page.getByLabel("Starts").fill(tomorrowAt(hour));
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
  };

  await editEvent(18);
  const update = await waitForEmail(guestEmail, "Update: Dinner party");
  const headers = await emailHeaders(update);
  expect(headers["List-Unsubscribe"]?.[0]).toMatch(/\/api\/unsubscribe\?t=guest\./);
  expect(headers["List-Unsubscribe-Post"]?.[0]).toBe("List-Unsubscribe=One-Click");

  // The link in the email body asks for confirmation before doing anything.
  const link = findLink(update, "/unsubscribe?t=");
  await guestContext.pages()[0]?.goto(link);
  const unsubscribePage = guestContext.pages()[0];
  if (!unsubscribePage) throw new Error("no page");
  await expect(
    unsubscribePage.getByRole("heading", { name: "Unsubscribe from Comeby emails" }),
  ).toBeVisible();
  await unsubscribePage.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(unsubscribePage.getByText("You're unsubscribed")).toBeVisible();

  // A further change no longer emails this guest.
  const before = await countEmails(guestEmail, "Update: Dinner party");
  await editEvent(19);
  await page.waitForTimeout(6000);
  expect(await countEmails(guestEmail, "Update: Dinner party")).toBe(before);
  await guestContext.close();
});

test("a tampered unsubscribe link is refused", async ({ page }) => {
  await page.goto("/unsubscribe?t=guest.dmljdGltQGV4YW1wbGUuY29t.0000");
  await expect(page.getByText("This link doesn't work")).toBeVisible();
  const response = await page.request.post(
    "/api/unsubscribe?t=guest.dmljdGltQGV4YW1wbGUuY29t.0000",
  );
  expect(response.status()).toBe(400);
});

test("email webhooks are off unless configured", async ({ request }) => {
  const resend = await request.post("/api/email/webhook/resend", { data: "{}" });
  const generic = await request.post("/api/email/webhook/generic", { data: "{}" });
  const unknown = await request.post("/api/email/webhook/mystery", { data: "{}" });
  expect([404, 401]).toContain(resend.status());
  expect([404, 401]).toContain(generic.status());
  expect(unknown.status()).toBe(404);
});
