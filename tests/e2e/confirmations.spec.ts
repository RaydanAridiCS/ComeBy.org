import type { Page, Route } from "@playwright/test";
import { createInvite, expect, respondAsGuest, signUpHost, test } from "./support";

/** Server actions are POSTs to the page itself, marked with a `next-action` header. */
function onActions(page: Page, path: string, handle: (route: Route) => Promise<void>) {
  return page.route(`**${path}`, (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"]
      ? handle(route)
      : route.continue(),
  );
}

async function openCancel(page: Page) {
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Cancel event" }).click();
  return page.getByRole("alertdialog", { name: "Cancel this event?" });
}

test("a confirm stays open while it works, and keeps a failure inside", async ({ page }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Rooftop party");
  const path = `/dashboard/events/${eventId}`;
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  // The request never arrives: the dialog stays, with the reason in it.
  await onActions(page, path, (route) => route.abort());
  let dialog = await openCancel(page);
  await dialog.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(dialog.getByRole("alert")).toContainText("We couldn't reach Comeby");
  await expect(dialog).toBeVisible();
  await page.unrouteAll();

  // A slow answer: the button spins, nothing closes it, and it closes once it's done.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await onActions(page, path, async (route) => {
    await held;
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByRole("button", { name: "Back" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /Yes, cancel it/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Event cancelled").first()).toBeVisible();
  // Opened from the menu, so focus goes back to the menu button.
  await expect(page.getByRole("button", { name: "More options" })).toBeFocused();
  await page.unrouteAll();

  // Idle, Escape just closes it.
  dialog = page.getByRole("alertdialog");
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Delete event" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a confirm is a bottom sheet on a phone and a centred dialog on a computer", async ({
  page,
  isMobile,
}) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Board games");
  await page.goto(`/dashboard/events/${eventId}`);
  const dialog = await openCancel(page);
  await expect(dialog).toBeVisible();
  // Let the entrance animation finish before measuring.
  await page.waitForTimeout(400);
  const box = await dialog.boundingBox();
  const confirm = await dialog.getByRole("button", { name: "Yes, cancel it" }).boundingBox();
  const viewport = page.viewportSize();
  if (!box || !confirm || !viewport) throw new Error("not measured");
  if (isMobile) {
    expect(Math.round(box.y + box.height)).toBe(viewport.height);
    expect(Math.round(box.width)).toBe(viewport.width);
    // Full width, last, and big enough for a thumb.
    expect(confirm.width).toBeGreaterThan(viewport.width - 60);
    expect(confirm.height).toBeGreaterThanOrEqual(44);
    expect(confirm.y).toBeGreaterThan(box.y + box.height - 100);
  } else {
    const middle = box.y + box.height / 2;
    expect(Math.abs(middle - viewport.height / 2)).toBeLessThan(2);
    expect(box.width).toBeLessThan(400);
  }
});

test("removing a response takes the row away at once", async ({ page, browser }) => {
  await signUpHost(page);
  const { eventId, inviteHref } = await createInvite(page, "Picnic");
  for (const name of ["Omar", "Mia"]) {
    const context = await browser.newContext();
    await respondAsGuest(await context.newPage(), inviteHref, { name });
    await context.close();
  }
  const path = `/dashboard/events/${eventId}`;
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/^2 of \d+ responses used$/)).toBeVisible();

  // The server is slow; the row and the counts don't wait for it.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await onActions(page, path, async (route) => {
    await held;
    await route.continue();
  });
  await page.getByRole("button", { name: "Remove Omar's response" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove response" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Remove Omar's response" })).toHaveCount(0);
  await expect(page.getByText(/^1 of \d+ responses used$/)).toBeVisible();
  // The row is gone, so focus moves to the next one.
  await expect(page.getByRole("button", { name: "Remove Mia's response" })).toBeFocused();
  release();
  await expect(page.getByText("Response removed")).toBeVisible();
  await page.unrouteAll();

  await page.reload();
  await expect(page.getByRole("button", { name: "Remove Mia's response" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Omar's response" })).toHaveCount(0);

  // A removal that fails puts the row back and says so.
  await onActions(page, path, (route) => route.abort());
  await page.getByRole("button", { name: "Remove Mia's response" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove response" }).click();
  await expect(page.getByText("We couldn't reach Comeby")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Mia's response" })).toBeVisible();
  await expect(page.getByText(/^1 of \d+ responses used$/)).toBeVisible();
});
