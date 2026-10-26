import { createInvite, expect, signUpHost, test } from "./support";

/** Collects anything the browser reports as blocked by the Content-Security-Policy. */
function watchForCspViolations(page: import("@playwright/test").Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/content security policy|refused to (load|execute|connect|frame|apply)/i.test(text)) {
      violations.push(text);
    }
  });
  page.on("pageerror", (error) => {
    if (/content security policy/i.test(error.message)) violations.push(error.message);
  });
  return violations;
}

test("every response carries a Content-Security-Policy and the other security headers", async ({
  request,
}) => {
  const response = await request.get("/");
  const csp =
    response.headers()["content-security-policy"] ??
    response.headers()["content-security-policy-report-only"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("public and auth pages run without CSP violations", async ({ page }) => {
  const violations = watchForCspViolations(page);
  for (const path of ["/", "/signup", "/login", "/forgot-password", "/privacy", "/terms"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});

test("the dashboard, event form and invite page run without CSP violations", async ({
  page,
  browser,
}) => {
  const violations = watchForCspViolations(page);
  await signUpHost(page);
  const { inviteHref } = await createInvite(page);
  await page.goto("/dashboard");
  await page.goto("/dashboard/settings");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const guestViolations = watchForCspViolations(guest);
  await guest.goto(inviteHref);
  await guest.waitForLoadState("networkidle");
  await guestContext.close();

  expect([...violations, ...guestViolations]).toEqual([]);
});

test("robots.txt and the sitemap agree: signup is not advertised", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(robots).toContain("Disallow: /");
  expect(robots).toContain("Allow: /$");
  expect(sitemap).toContain("/privacy");
  expect(sitemap).not.toContain("/signup");
});

test("the moderation page looks like it doesn't exist to everyone else", async ({ page }) => {
  // Signed out.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();

  // Signed in, but not an admin.
  await signUpHost(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await expect(page.getByText("Moderation")).toBeHidden();
});

test("creating events in a burst is rate-limited with a friendly message", async ({ page }) => {
  await signUpHost(page);
  for (let i = 0; i < 5; i++) await createInvite(page, `Burst ${i}`);

  await page.goto("/dashboard/events/new");
  await page.getByLabel("Event name").fill("One too many");
  await page.getByLabel("Starts").fill("2030-01-10T16:00");
  await page.getByLabel("Place name").fill("Somewhere");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByText("Too many attempts. Please wait a bit and try again.")).toBeVisible();
});
