import type { Browser, Page } from "@playwright/test";
import {
  createInvite,
  expect,
  respondAsGuest,
  signUpHost,
  test,
  tomorrowAt,
  withDatabase,
} from "./support";

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

test("the form asks what fits the answer, and catches an unfinished phone number", async ({
  page: guest,
  browser,
}) => {
  const host = await hostPage(browser);
  await host.goto("/dashboard/events/new");
  await host.getByLabel("Event name").fill("Lake picnic");
  await host.getByLabel("Starts").fill(tomorrowAt(12));
  await host.getByText("What guests are asked").click();
  await host.getByRole("radio", { name: "Optional" }).first().click();
  await host.getByLabel("Let guests bring others (+1s)").click();
  await host.getByRole("button", { name: "Add question" }).click();
  await host.getByLabel("Question", { exact: true }).fill("Any food allergies?");
  await host.getByRole("switch", { name: "Required" }).click();
  await host.getByRole("button", { name: "Create invite" }).click();
  await expect(host).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  const inviteHref =
    (await host.getByRole("link", { name: "View invite" }).first().getAttribute("href")) ?? "/";
  await host.context().close();

  await guest.goto(inviteHref);
  const more = guest.getByText("Add a note or get updates");

  // Going: what's needed is in view, the optional fields wait behind one row.
  await guest.getByRole("radio", { name: "Going" }).click();
  await expect(guest.getByLabel("Any food allergies?")).toBeVisible();
  await expect(guest.getByText("Bringing anyone?")).toBeVisible();
  await expect(guest.getByLabel(/Phone number/)).toBeHidden();
  await more.click();
  await expect(guest.getByLabel(/Phone number/)).toBeVisible();
  await expect(guest.getByLabel(/Message to the host/)).toHaveAttribute(
    "placeholder",
    "Can't wait! 🎉",
  );

  // Half a phone number is pointed out, not dropped.
  await guest.getByLabel("Your name").fill("Omar");
  await guest.getByLabel("Any food allergies?").fill("None");
  await guest.getByLabel(/Phone number/).fill("12");
  await guest.getByRole("button", { name: "Send response" }).click();
  await expect(guest.getByText("Please enter a valid phone number.")).toBeVisible();
  await expect(guest.getByLabel(/Phone number/)).toBeFocused();
  await guest.getByLabel(/Phone number/).fill("");

  // Can't go: no questions, no +1s; the phone and the message stay.
  await guest.getByRole("radio", { name: "Can't go" }).click();
  await expect(guest.getByLabel("Any food allergies?")).toHaveCount(0);
  await expect(guest.getByText("Bringing anyone?")).toHaveCount(0);
  await expect(guest.getByLabel(/Phone number/)).toBeVisible();
  await expect(guest.getByLabel(/Message to the host/)).toHaveAttribute(
    "placeholder",
    "Sorry to miss it",
  );
  await guest.getByRole("button", { name: "Send response" }).click();
  await expect(guest.getByRole("heading", { name: /Thanks for letting .+ know/ })).toBeVisible();
  // The only calendar button left is the one by the date.
  await expect(guest.getByText("Add to calendar")).toHaveCount(1);
});

test("a long guest list keeps the answer buttons in place", async ({ page, browser }) => {
  await signUpHost(page);
  await page.goto("/dashboard/events/new");
  await page.getByLabel("Event name").fill("Garden party");
  await page.getByLabel("Starts").fill(tomorrowAt(15));
  await page.getByText("Privacy", { exact: true }).click();
  await page.getByRole("radio", { name: "Names of who's going" }).click();
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)?.[1] ?? "";
  const inviteHref =
    (await page.getByRole("link", { name: "View invite" }).first().getAttribute("href")) ?? "/";

  // Ten guests who said yes, two of them bringing someone.
  await withDatabase(async (sql) => {
    for (let index = 0; index < 10; index++) {
      await sql`INSERT INTO rsvps (event_id, status, name, plus_ones, edit_token_hash)
        VALUES (${eventId}, 'going', ${`Guest ${index + 1}`}, ${index < 2 ? 1 : 0}, ${`hash-${index}`})`;
    }
  });

  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto(inviteHref);
  await expect(guest.getByText("12 people going, counting +1s")).toBeVisible();
  await expect(guest.getByRole("listitem").filter({ hasText: /^GGuest \d+$/ })).toHaveCount(8);
  await expect(guest.getByText("and 2 more")).toBeVisible();
  await context.close();
});

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
