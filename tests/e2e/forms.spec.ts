import { createInvite, expect, signUpHost, test, tomorrowAt } from "./support";

/** The id an input points at with aria-describedby must exist and hold this text. */
async function expectDescribedBy(input: import("@playwright/test").Locator, text: string | RegExp) {
  const ids = ((await input.getAttribute("aria-describedby")) ?? "").split(" ").filter(Boolean);
  expect(ids.length).toBeGreaterThan(0);
  const texts = await Promise.all(
    ids.map((id) => input.page().locator(`[id="${id}"]`).innerText()),
  );
  expect(texts.join(" ")).toMatch(text);
}

test("event form: an empty submit marks, explains and focuses the first problem", async ({
  page,
}) => {
  await signUpHost(page);
  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Create invite" }).click();

  const title = page.getByLabel("Event name");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toBeFocused();
  await expect(
    page.getByRole("alert").filter({ hasText: "Give your event a name." }),
  ).toBeVisible();
  await expectDescribedBy(title, "Give your event a name.");
  await expect(page.getByLabel("Starts")).toHaveAttribute("aria-invalid", "true");

  // Fixing a field clears its mark.
  await title.fill("Picnic");
  await title.blur();
  await expect(title).not.toHaveAttribute("aria-invalid", "true");
});

test("event form: a problem in a collapsed section opens it and focuses the field", async ({
  page,
}) => {
  await signUpHost(page);
  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Event name").fill("Picnic");
  await page.getByLabel("Starts").fill(tomorrowAt(16));

  const section = page.locator("summary").filter({ hasText: "Link & RSVP deadline" });
  const link = page.getByLabel("Event link");
  await section.click();
  await link.fill("no spaces allowed");
  await section.click();
  await expect(link).toBeHidden();

  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(link).toBeVisible();
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await expectDescribedBy(link, /Only lowercase letters/);
});

test("event form: a link that is already taken is handled like any other field error", async ({
  page,
}) => {
  await signUpHost(page);
  const taken = `taken-${Date.now().toString(36)}`;

  for (const attempt of ["first", "second"] as const) {
    await page.goto("/dashboard/events/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Event name").fill(`Picnic ${attempt}`);
    await page.getByLabel("Starts").fill(tomorrowAt(16));
    await page.locator("summary").filter({ hasText: "Link & RSVP deadline" }).click();
    await page.getByLabel("Event link").fill(taken);
    await page.locator("summary").filter({ hasText: "Link & RSVP deadline" }).click();
    await page.getByRole("button", { name: "Create invite" }).click();
    if (attempt === "first") await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  }

  // The server said no: the section opens, the field is marked, explained and focused.
  const link = page.getByLabel("Event link");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await expect(link).toBeFocused();
  await expectDescribedBy(link, "That link is already taken");
});

test("event form: custom question problems point at the boxes to fill in", async ({ page }) => {
  await signUpHost(page);
  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Event name").fill("Picnic");
  await page.getByLabel("Starts").fill(tomorrowAt(16));
  await page.locator("summary").filter({ hasText: "What guests are asked" }).click();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question", { exact: true }).fill("What will you bring?");
  await page.getByRole("combobox", { name: "Answer type" }).click();
  await page.getByRole("option", { name: "Multiple choice" }).click();
  await page.getByRole("button", { name: "Create invite" }).click();

  const first = page.getByRole("textbox", { name: "Choice 1" });
  await expect(first).toHaveAttribute("aria-invalid", "true");
  await expect(first).toBeFocused();
  await expectDescribedBy(first, "Add at least two choices.");

  // Filling them in clears the error without another submit.
  await first.fill("Dessert");
  await page.getByRole("textbox", { name: "Choice 2" }).fill("Drinks");
  await expect(page.getByText("Add at least two choices.")).toBeHidden();
});

test("leaving the event form with unsaved changes asks first; a clean form does not", async ({
  page,
}) => {
  await signUpHost(page);
  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  const home = page.getByRole("banner").getByRole("link", { name: "Comeby" });

  // The browser's own "leave site?" prompt, counted. Accepting lets the reload go ahead.
  const prompts: string[] = [];
  page.on("dialog", (browserDialog) => {
    prompts.push(browserDialog.type());
    void browserDialog.accept();
  });

  // Nothing typed: no question, in the app or from the browser.
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(prompts).toEqual([]);
  await home.click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Event name").fill("Half-written picnic");
  await home.click();
  const dialog = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/dashboard\/events\/new$/);
  await expect(page.getByLabel("Event name")).toHaveValue("Half-written picnic");

  await home.click();
  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // The form is kept, hidden, so a draft survives coming back; it must not prompt meanwhile.
  await expect(page.getByLabel("Event name")).toBeHidden();
  expect(prompts).toEqual([]);

  // Reloading or closing the tab with unsaved changes brings up the browser's prompt.
  await page.goto("/dashboard/events/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Event name").fill("Half-written picnic");
  await page.reload();
  expect(prompts).toEqual(["beforeunload"]);
});

test("after creating an event, 'New event' opens a blank form that is guarded again", async ({
  page,
}) => {
  await signUpHost(page);
  await createInvite(page, "First picnic");
  const newEvent = page.getByRole("banner").getByRole("link", { name: "New event" });

  // In-app navigation, as a host does it: the page is reused, so it must have been cleared.
  await newEvent.click();
  await expect(page).toHaveURL(/\/dashboard\/events\/new$/);
  const title = page.getByLabel("Event name");
  await expect(title).toBeVisible();
  await expect(title).toHaveValue("");
  await expect(page.getByLabel("Starts")).toHaveValue("");
  await expect(page.getByLabel("Place name")).toHaveValue("");

  // A draft typed into the reused form is protected like any other...
  await title.fill("Second picnic, half-written");
  await page.getByRole("banner").getByRole("link", { name: "Comeby" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // ...and is still there when the host comes back to it.
  await newEvent.click();
  await expect(title).toHaveValue("Second picnic, half-written");
});

test("saving an edit never asks, and the edit page's back link is guarded", async ({ page }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Board games");

  await page.goto(`/dashboard/events/${eventId}/edit`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Event name").fill("Board games, round two");
  await page.getByRole("link", { name: "Back" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/events/${eventId}$`));
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Board games, round two" })).toBeVisible();
});

test("RSVP form: a missing name is marked, announced and focused", async ({ page, browser }) => {
  await signUpHost(page);
  const { inviteHref } = await createInvite(page, "Rooftop dinner");

  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto(inviteHref);
  await guest.getByRole("radio", { name: "Going" }).click();
  await guest.getByText("Add a note or get updates").click();
  await guest.getByLabel("Email for updates").fill("not-an-email");
  await guest.getByRole("button", { name: "Send response" }).click();

  const name = guest.getByLabel("Your name");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await expect(
    guest.getByRole("alert").filter({ hasText: "Please enter your name." }),
  ).toBeVisible();
  await expectDescribedBy(name, "Please enter your name.");

  const email = guest.getByLabel("Email for updates");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expectDescribedBy(email, /Please enter a valid email\..*Only used to tell you/s);
  await context.close();
});
