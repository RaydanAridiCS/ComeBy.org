import { readFile } from "node:fs/promises";
import { findLink, waitForEmail } from "./mailpit";
import { createInvite, expect, respondAsGuest, signUpHost, test, uniqueEmail } from "./support";

test("a guest downloads and deletes their own response", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Games night");

  // Someone else has responded too; their data must never show up for this guest.
  const bystander = await browser.newContext();
  await respondAsGuest(await bystander.newPage(), inviteHref, { name: "Bystander Bob" });
  await bystander.close();

  const guestEmail = uniqueEmail("guest");
  const context = await browser.newContext({ acceptDownloads: true });
  const guest = await context.newPage();
  await respondAsGuest(guest, inviteHref, { name: "Omar", email: guestEmail });
  const confirmation = await waitForEmail(guestEmail, "Games night");
  const editLink = findLink(confirmation, "/r/");

  // Download my data: only this guest's response.
  await guest.goto(inviteHref);
  const [download] = await Promise.all([
    guest.waitForEvent("download"),
    guest.getByRole("link", { name: "Download my data" }).click(),
  ]);
  const path = await download.path();
  const data = JSON.parse(await readFile(path, "utf8"));
  expect(data.response).toMatchObject({ name: "Omar", email: guestEmail, status: "going" });
  expect(JSON.stringify(data)).not.toContain("Bystander Bob");

  // Delete my response: asks first, then removes everything.
  await guest.getByRole("button", { name: "Delete my response" }).click();
  await expect(guest.getByText("Delete your response?")).toBeVisible();
  await guest.getByRole("button", { name: "Keep it" }).click();
  await expect(guest.getByText("Delete your response?")).toBeHidden();
  await guest.getByRole("button", { name: "Delete my response" }).click();
  await guest.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(guest.getByText("Your response was deleted")).toBeVisible();
  await waitForEmail(guestEmail, "Your response to Games night was deleted");

  // The private link and the download are dead, and the invite asks again.
  await guest.goto(editLink);
  await expect(guest).toHaveURL(/\/$/);
  const afterDelete = await context.request.get(`/api/rsvp/export?event=${eventId}`);
  expect(afterDelete.status()).toBe(404);
  await guest.goto(inviteHref);
  await expect(guest.getByRole("radio", { name: "Going" })).toBeVisible();
  await context.close();

  // The host no longer sees the guest, and the timeline doesn't name them.
  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("Bystander Bob").first()).toBeVisible();
  await expect(page.getByText("Omar")).toHaveCount(0);
  await expect(page.getByText("A guest deleted their response")).toBeVisible();
});

test("the data download refuses visitors without a response", async ({ page, request }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Quiet night");
  expect((await request.get(`/api/rsvp/export?event=${eventId}`)).status()).toBe(404);
  expect((await request.get("/api/rsvp/export?event=not-a-uuid")).status()).toBe(404);
});
