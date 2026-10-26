import { test as base, expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { findLink, waitForEmail } from "./mailpit";

/**
 * Every test acts from its own fake client address. The app rate-limits by network (sign-ups
 * per minute and per day, responses per device), so tests sharing 127.0.0.1 would trip each
 * other's limits.
 */
export const test = base.extend({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures must destructure their first argument
  extraHTTPHeaders: async ({}, use) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await use({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
  },
});

export { expect };

const databaseUrl = process.env.DATABASE_URL ?? "postgres://comeby:comeby@localhost:5432/comeby";

/**
 * Direct database access for test setup only (the app under test uses the same database).
 */
export async function withDatabase<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

export const uniqueEmail = (prefix = "host") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

/** `YYYY-MM-DDTHH:00` for tomorrow, the format of the event form's date field. */
export function tomorrowAt(hour: number): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;
}

/** Signs up through the real form, confirms the email from Mailpit, and lands on the dashboard. */
export async function signUpHost(page: Page, options: { email?: string; name?: string } = {}) {
  const email = options.email ?? uniqueEmail();
  await page.goto("/signup");
  // Submitting before the page has hydrated would send a plain form request instead.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your name").fill(options.name ?? "Lina");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  const verification = await waitForEmail(email, "Confirm your email");
  await page.goto(findLink(verification, "verify-email"));
  await expect(page).toHaveURL(/\/dashboard/);
  return { email };
}

/** Creates an event through the real form. Returns the event id and its public link. */
export async function createInvite(page: Page, title = "Picnic in the park") {
  await page.goto("/dashboard/events/new");
  await page.getByLabel("Event name").fill(title);
  await page.getByLabel("Starts").fill(tomorrowAt(16));
  await page.getByLabel("Place name").fill("Central Park");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/[0-9a-f-]{36}/);
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)?.[1] ?? "";
  const inviteHref = await page.getByRole("link", { name: "View invite" }).getAttribute("href");
  return { eventId, inviteHref: inviteHref ?? "/" };
}

/** A guest answering an invite in their own browser context. */
export async function respondAsGuest(
  guest: Page,
  inviteHref: string,
  options: { name?: string; email?: string; status?: "Going" | "Maybe" | "Can't go" } = {},
) {
  await guest.goto(inviteHref);
  await guest.getByRole("radio", { name: options.status ?? "Going" }).click();
  await guest.getByLabel("Your name").fill(options.name ?? "Omar");
  if (options.email) await guest.getByLabel("Email for updates").fill(options.email);
  await guest.getByRole("button", { name: "Send response" }).click();
  // The button's label changes while sending, so wait for the confirmation instead; leaving
  // earlier would cancel the request before the guest's cookie is saved.
  await expect(
    guest.getByText(/You're in!|Got it, maybe!|Thanks for letting them know/),
  ).toBeVisible();
}
