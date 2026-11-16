import { findLink, waitForEmail } from "./mailpit";
import { expect, signUpHost, test, uniqueEmail } from "./support";

test("forgot password: the email, a new password, and the way back to sign in", async ({
  page,
}) => {
  const { email } = await signUpHost(page);
  await page.context().clearCookies();

  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  // One heading, about what happened; the form's own heading and subtitle are gone.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your email");
  await expect(page.getByText(`If ${email} has a Comeby account`)).toBeVisible();
  await expect(page.getByText("Enter your email and we'll send you a reset link.")).toBeHidden();
  await expect(page.getByRole("button", { name: /Send again in \d+s/ })).toBeDisabled();

  // "Back to sign in" works.
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  // The emailed link leads to a new password, then to signing in with it.
  const mail = await waitForEmail(email, "Reset your Comeby password");
  await page.goto(findLink(mail, "reset-password"));
  await expect(page.getByText("At least 8 characters.")).toBeVisible();
  await page.getByLabel("New password").fill("a-fresh-passphrase");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Password changed");
  await page.getByRole("link", { name: "Sign in" }).click();

  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a-fresh-passphrase");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("a broken reset link says so and offers a new one, with no form", async ({ page }) => {
  for (const path of ["/reset-password", "/reset-password?token=nope&error=INVALID_TOKEN"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link doesn't work");
    await expect(page.getByText("This one has expired or was already used.")).toBeVisible();
    await expect(page.getByLabel("New password")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Get a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("after signing up, the host can go back and fix a mistyped address", async ({ page }) => {
  const email = uniqueEmail("typo");
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill("Lina");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your email");
  await expect(page.getByText("Create your account")).toBeHidden();

  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Your name")).toHaveValue("Lina");
});

test("sign-in says what is missing, and points at it", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  const password = page.getByLabel("Password", { exact: true });
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute("aria-invalid", "true");

  // A wrong password is announced, and focus goes back to the field to try again.
  await password.fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
  await expect(password).toBeFocused();
});
