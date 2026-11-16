import type { Browser, Page } from "@playwright/test";
import { createInvite, expect, respondAsGuest, signUpHost, test, tomorrowAt } from "./support";

const LONG_DETAILS = Array.from(
  { length: 12 },
  (_, line) => `Line ${line + 1}: bring a jacket, it gets windy on the roof after sunset.`,
).join("\n");

/**
 * The host works in a context of their own with its own address, so the test's `page` (a
 * phone on the mobile project) can be the guest.
 */
async function hostPage(browser: Browser) {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` },
  });
  const page = await context.newPage();
  await signUpHost(page);
  return page;
}

/** An event whose answer buttons start well below the first screen, with +1s allowed. */
async function createLongInvite(page: Page) {
  await page.goto("/dashboard/events/new");
  await page.getByLabel("Event name").fill("Rooftop party");
  await page.getByLabel("Starts").fill(tomorrowAt(19));
  await page.getByLabel("Place name").fill("The roof");
  await page.getByLabel("Details").fill(LONG_DETAILS);
  await page.getByText("What guests are asked").click();
  await page.getByLabel("Let guests bring others (+1s)").click();
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)?.[1] ?? "";
  const inviteHref =
    (await page.getByRole("link", { name: "View invite" }).first().getAttribute("href")) ?? "/";
  return { eventId, inviteHref };
}

const bar = (page: Page) => page.locator("[data-rsvp-bar]");

test("on a phone, a bar points to the form until it's on screen", async ({
  page: guest,
  browser,
  isMobile,
}) => {
  test.skip(!isMobile, "The bar matters where the form starts below the first screen.");
  const host = await hostPage(browser);
  const { inviteHref } = await createLongInvite(host);
  await host.context().close();

  await guest.goto(inviteHref);
  await expect(bar(guest)).toHaveAttribute("data-visible", "true");
  await expect(bar(guest).getByRole("button", { name: "RSVP" })).toBeInViewport();
  await expect(guest.getByRole("radio", { name: "Going" })).not.toBeInViewport();

  // Tapping it brings the answers up and puts focus on the first one.
  await bar(guest).getByRole("button", { name: "RSVP" }).click();
  await expect(guest.getByRole("radio", { name: "Going" })).toBeFocused();
  await expect(guest.getByRole("radio", { name: "Going" })).toBeInViewport();
  await expect(bar(guest)).toHaveAttribute("data-visible", "false");

  // Back at the top it returns; once the guest has answered it is gone for good.
  await guest.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(bar(guest)).toHaveAttribute("data-visible", "true");
  await guest.getByRole("radio", { name: "Going" }).click();
  await guest.getByLabel("Your name").fill("Omar");
  await guest.getByRole("radio", { name: "+1 person" }).click();
  await guest.getByRole("button", { name: "Send response" }).click();
  await expect(guest.getByRole("heading", { name: /You're in!/ })).toBeFocused();
  await expect(guest.getByRole("heading", { name: /You're in!/ })).toBeInViewport();
  await expect(bar(guest)).toHaveCount(0);

  // A later visit: what they said, the +1s, and that it can be changed.
  await guest.reload();
  await expect(guest.getByText("Your response: Going")).toBeVisible();
  await expect(guest.getByText("You're bringing 1 more person")).toBeVisible();
  await expect(guest.getByText(/You can change it any time on this device\./)).toBeVisible();
  await expect(guest.getByRole("button", { name: "Change my response" })).toBeVisible();
  await expect(bar(guest)).toHaveCount(0);
});

test("no bar on a cancelled event", async ({ page: guest, browser, isMobile }) => {
  test.skip(!isMobile, "The bar only matters on a phone.");
  const host = await hostPage(browser);
  const { eventId, inviteHref } = await createLongInvite(host);
  await host.goto(`/dashboard/events/${eventId}`);
  await host.getByRole("button", { name: "More options" }).click();
  await host.getByRole("menuitem", { name: "Cancel event" }).click();
  await host.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(host.getByText("Event cancelled").first()).toBeVisible();
  await host.context().close();

  await guest.goto(inviteHref);
  await expect(guest.getByText("This event has been cancelled").first()).toBeVisible();
  await guest.waitForLoadState("networkidle");
  await expect(bar(guest)).toHaveCount(0);
});

test("changing a response can be called off, and focus follows", async ({ page, browser }) => {
  await signUpHost(page);
  const { inviteHref } = await createInvite(page, "Board games");
  const context = await browser.newContext();
  const guest = await context.newPage();
  await respondAsGuest(guest, inviteHref, { status: "Maybe" });

  // Straight after answering: the same button as on a later visit.
  await guest.getByRole("button", { name: "Change my response" }).click();
  await expect(guest.getByRole("heading", { name: "Change your response" })).toBeVisible();
  await expect(guest.getByRole("radio", { name: "Maybe" })).toBeFocused();
  await guest.getByRole("radio", { name: "Can't go" }).click();

  // "Keep my answer" sends nothing and forgets the edit.
  await guest.getByRole("button", { name: "Keep my answer" }).click();
  await expect(guest.getByText("Your response: Maybe")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Change my response" })).toBeFocused();
  await guest.reload();
  await expect(guest.getByText("Your response: Maybe")).toBeVisible();

  await guest.getByRole("button", { name: "Change my response" }).click();
  await expect(guest.getByRole("radio", { name: "Maybe" })).toBeFocused();
  await guest.getByRole("radio", { name: "Going" }).click();
  await guest.getByRole("button", { name: "Update response" }).click();
  await expect(guest.getByRole("heading", { name: /You're in!/ })).toBeFocused();
  await context.close();
});
