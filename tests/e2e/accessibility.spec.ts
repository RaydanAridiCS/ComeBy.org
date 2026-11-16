import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { createInvite, expect, respondAsGuest, signUpHost, test } from "./support";

// Entrance animations make colours mid-fade, which axe would misread as low contrast.
test.use({ reducedMotion: "reduce" });

/** Fails on serious and critical WCAG A/AA problems; lists them readably. */
async function expectNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious.map((violation) => ({
      page: label,
      rule: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

test("public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/signup", "/login", "/forgot-password", "/privacy", "/terms"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSeriousViolations(page, path);
  }
});

test("not-found pages have no serious accessibility violations", async ({ page }) => {
  const pages = [
    ["/some/unknown/path", "Page not found"],
    ["/no-such-invite-123", "Invite not found"],
    ["/r/invalid", "This link doesn't work"],
  ] as const;
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectNoSeriousViolations(page, path);
  }

  await signUpHost(page);
  await page.goto("/dashboard/events/not-an-id");
  await expect(page.getByRole("heading", { name: "We couldn't find that event" })).toBeVisible();
  await expectNoSeriousViolations(page, "/dashboard/events/not-an-id");
});

test("the event page with responses and the edit form have no serious violations", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Sunday brunch");
  for (const [name, status] of [
    ["Omar", "Going"],
    ["Maya", "Maybe"],
    ["Karim", "Can't go"],
  ] as const) {
    const context = await browser.newContext();
    await respondAsGuest(await context.newPage(), inviteHref, { name, status });
    await context.close();
  }

  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("Karim", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoSeriousViolations(page, "event page with responses");

  // The confirm step, open (a bottom sheet on the mobile project).
  await page.getByRole("button", { name: "Remove Karim's response" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expectNoSeriousViolations(page, "remove-response confirm");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Remove Karim's response" })).toBeFocused();

  await page.goto(`/dashboard/events/${eventId}/edit`);
  await expect(page.getByLabel("Event name")).toHaveValue("Sunday brunch");
  await page.waitForLoadState("networkidle");
  await expectNoSeriousViolations(page, "edit form");
});

test("both forms in their error state have no serious violations", async ({ page, browser }) => {
  await signUpHost(page);
  const { inviteHref } = await createInvite(page, "Tea at five");

  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByLabel("Event name")).toHaveAttribute("aria-invalid", "true");
  await expectNoSeriousViolations(page, "new-event form with errors");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await guest.getByRole("radio", { name: "Going" }).click();
  await guest.getByRole("button", { name: "Send response" }).click();
  await expect(guest.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
  await expectNoSeriousViolations(guest, "RSVP form with errors");
  await guestContext.close();
});

test("invites in other themes, dark ones included, have no serious violations", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  for (const theme of ["Midnight", "Cyber", "Bloom", "Clean"]) {
    const { inviteHref } = await createInvite(page, `${theme} evening`, { theme });
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(inviteHref);
    await guest.waitForLoadState("networkidle");
    await expectNoSeriousViolations(guest, `invite in ${theme}`);
    // The open form too: inputs, hints and the send button in that theme's colours.
    await guest.getByRole("radio", { name: "Going" }).click();
    await guest.getByRole("button", { name: "Send response" }).click();
    await expect(guest.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
    await expectNoSeriousViolations(guest, `invite in ${theme}, form with an error`);
    await guestContext.close();
  }
});

test("the invite page and host screens have no serious accessibility violations", async ({
  page,
  browser,
}) => {
  await signUpHost(page);
  const { inviteHref } = await createInvite(page);

  await page.goto("/dashboard");
  await expectNoSeriousViolations(page, "/dashboard");
  await page.goto("/dashboard/events/new");
  await expectNoSeriousViolations(page, "/dashboard/events/new");
  await page.goto("/dashboard/settings");
  await expectNoSeriousViolations(page, "/dashboard/settings");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteHref);
  await guest.waitForLoadState("networkidle");
  await expectNoSeriousViolations(guest, inviteHref);

  // After responding, the invite also offers "download" and "delete my response".
  await respondAsGuest(guest, inviteHref);
  await guest.goto(inviteHref);
  await expect(guest.getByRole("button", { name: "Delete my response" })).toBeVisible();
  await expectNoSeriousViolations(guest, `${inviteHref} (responded)`);
  await guest.getByRole("button", { name: "Delete my response" }).click();
  await expect(guest.getByText("Delete your response?")).toBeVisible();
  await expectNoSeriousViolations(guest, `${inviteHref} (delete confirmation)`);
  await guestContext.close();
});
