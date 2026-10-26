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
