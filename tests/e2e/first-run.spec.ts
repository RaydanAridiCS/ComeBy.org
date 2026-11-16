import { findLink, waitForEmail } from "./mailpit";
import {
  createInvite,
  expect,
  signUpHost,
  test,
  tomorrowAt,
  uniqueEmail,
  withDatabase,
} from "./support";

const TIP = "Give it a name and a time. Everything else has good defaults.";

test("a new host goes from the confirmation link to a shareable invite", async ({ page }) => {
  // signUpHost checks that the confirmation link opens the new-event form.
  await signUpHost(page);
  await page.waitForLoadState("networkidle");
  const tip = page.getByRole("status").filter({ hasText: TIP });
  await expect(tip).toBeVisible();

  // Closing the tip puts the cursor where it pointed, and it stays closed.
  const saved = page.waitForResponse((response) => response.request().method() === "POST");
  await tip.getByRole("button", { name: "Hide this tip" }).click();
  await expect(tip).toBeHidden();
  await expect(page.getByLabel("Event name")).toBeFocused();
  await saved;
  expect((await page.context().cookies()).map((cookie) => cookie.name)).toContain(
    "comeby_first_event_tip",
  );
  await page.reload();
  await expect(page.getByLabel("Event name")).toBeVisible();
  await expect(page.getByText(TIP)).toHaveCount(0);

  // A name and a time are enough; nothing comes between "Create" and the share panel.
  await page.getByLabel("Event name").fill("First picnic");
  await page.getByLabel("Starts").fill(tomorrowAt(16));
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByRole("region", { name: "Your invite is ready" })).toBeVisible();
});

test("the tip shows on a host's first event only", async ({ page }) => {
  await signUpHost(page);
  await expect(page.getByText(TIP)).toBeVisible();
  await createInvite(page, "Book club");
  await page.goto("/dashboard/events/new");
  await expect(page.getByLabel("Event name")).toBeVisible();
  await expect(page.getByText(TIP)).toHaveCount(0);
});

test("a confirmation link goes to the page that was asked for", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/signup?next=/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill("Lina");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const verification = await waitForEmail(email, "Confirm your email");
  await page.goto(findLink(verification, "verify-email"));
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
});

test("a host with only past events is asked to plan the next one", async ({ page }) => {
  await signUpHost(page);
  const { eventId } = await createInvite(page, "Summer barbecue");
  await withDatabase(
    (sql) =>
      sql`UPDATE events SET starts_at = now() - interval '30 days', ends_at = null WHERE id = ${eventId}`,
  );

  await page.goto("/dashboard");
  const upcoming = page.getByRole("tabpanel", { name: /Upcoming/ });
  await expect(upcoming.getByRole("heading", { name: "Nothing coming up" })).toBeVisible();
  await expect(page.getByText("Create your first invite")).toHaveCount(0);
  await expect(upcoming.getByRole("link", { name: "Create event" })).toHaveAttribute(
    "href",
    "/dashboard/events/new",
  );

  // Starting from the past event copies it and opens the copy to set a new date.
  await upcoming.getByRole("button", { name: "Start from “Summer barbecue”" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}\/edit$/);
  expect(page.url()).not.toContain(eventId);
  await expect(page.getByLabel("Event name")).toHaveValue("Summer barbecue");
});

test("the public header knows a signed-in host", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(header.getByRole("link", { name: "My events" })).toHaveCount(0);

  await signUpHost(page);
  for (const path of ["/", "/privacy"]) {
    await page.goto(path);
    const signedIn = page.getByRole("banner");
    await expect(signedIn.getByRole("link", { name: "My events" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    await expect(signedIn.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(signedIn.getByRole("link", { name: "Create invite" })).toHaveCount(0);
  }
});
