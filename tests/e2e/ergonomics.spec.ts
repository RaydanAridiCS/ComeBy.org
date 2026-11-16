import type { Page } from "@playwright/test";
import { createInvite, expect, signUpHost, test } from "./support";

/** The first Tab shows "Skip to content"; using it puts focus on the page's <main>. */
async function expectSkipLink(page: Page) {
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
}

test("every page starts with a skip link to its main content", async ({ page }) => {
  for (const path of ["/", "/login", "/privacy", "/no-such-page-anywhere"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectSkipLink(page);
  }

  await signUpHost(page);
  await expectSkipLink(page);
  const { inviteHref } = await createInvite(page, "Skip link check");
  await page.goto(inviteHref);
  await page.waitForLoadState("networkidle");
  await expectSkipLink(page);
});

/**
 * Controls a thumb must hit that are under 44 × 44 px, counting an invisible hit area drawn
 * with ::before or ::after (the `hit-area` utility). Text links inside a sentence are exempt.
 */
async function smallTargets(page: Page) {
  await page.waitForLoadState("networkidle");
  // Entrance animations scale things down for a moment.
  await page.waitForTimeout(1000);
  return page.evaluate(() => {
    const pseudo = (el: Element, which: string): [number, number] => {
      const s = getComputedStyle(el, which);
      if (s.content === "none" || s.content === "normal" || s.position !== "absolute")
        return [0, 0];
      return [Number.parseFloat(s.width) || 0, Number.parseFloat(s.height) || 0];
    };
    const small: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      'a[href], button, select, textarea, input:not([type="hidden"]), [role="radio"], [role="tab"], [role="checkbox"], summary',
    )) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || style.visibility === "hidden") continue;
      if (el.closest('[aria-hidden="true"]') || el.getAttribute("href") === "#main") continue;
      // Closed <details> content is laid out but not shown.
      if (el.closest("details:not([open]) > :not(summary)")) continue;
      const parent = el.parentElement;
      const inSentence =
        el.tagName === "A" &&
        parent &&
        /^(P|SPAN|LI)$/.test(parent.tagName) &&
        (parent.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 10;
      if (inSentence) continue;
      const label = el.closest("label")?.getBoundingClientRect();
      const [bw, bh] = pseudo(el, "::before");
      const [aw, ah] = pseudo(el, "::after");
      const w = Math.max(r.width, label?.width ?? 0, bw, aw);
      const h = Math.max(r.height, label?.height ?? 0, bh, ah);
      if (w < 43.5 || h < 43.5) {
        const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim();
        small.push(`${name.slice(0, 30)} ${Math.round(w)}x${Math.round(h)}`);
      }
    }
    return small;
  });
}

test("controls on a phone are at least 44 px to a thumb", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch targets are a phone concern; desktop sizes stay compact.");
  for (const path of ["/", "/login", "/signup", "/forgot-password"]) {
    await page.goto(path);
    expect(await smallTargets(page), path).toEqual([]);
  }

  await signUpHost(page);
  expect(await smallTargets(page), "event list (empty)").toEqual([]);
  const { eventId, inviteHref } = await createInvite(page, "Thumb check");
  await page.goto(`/dashboard/events/${eventId}`);
  expect(await smallTargets(page), "event page").toEqual([]);
  await page.goto(`/dashboard/events/${eventId}/edit`);
  expect(await smallTargets(page), "edit form").toEqual([]);
  await page.goto("/dashboard/settings");
  expect(await smallTargets(page), "settings").toEqual([]);
  await page.goto(inviteHref);
  expect(await smallTargets(page), "invite").toEqual([]);
});
