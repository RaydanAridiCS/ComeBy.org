const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
export type MailpitMessage = { ID: string; Text: string; HTML: string; Subject: string };

async function search(to: string): Promise<MailpitSearch["messages"]> {
  const response = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
  );
  if (!response.ok) return [];
  return ((await response.json()) as MailpitSearch).messages;
}

/** Waits for an email to `to` whose subject contains `subject`, and returns it. */
export async function waitForEmail(
  to: string,
  subject: string,
  timeoutMs = 60_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = (await search(to)).find((message) => message.Subject.includes(subject));
    if (match) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      return (await message.json()) as MailpitMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email to ${to} with subject containing "${subject}"`);
}

/** How many emails to `to` have a subject containing `subject` right now. */
export async function countEmails(to: string, subject: string): Promise<number> {
  return (await search(to)).filter((message) => message.Subject.includes(subject)).length;
}

/** The raw headers of a delivered email, keyed by header name (values are lists). */
export async function emailHeaders(message: MailpitMessage): Promise<Record<string, string[]>> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}/headers`);
  return (await response.json()) as Record<string, string[]>;
}

/** First link in an email's text body that contains `fragment`. */
export function findLink(message: MailpitMessage, fragment: string): string {
  const links = message.Text.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  const link = links.find((candidate) => candidate.includes(fragment));
  if (!link) throw new Error(`No link containing "${fragment}" in email "${message.Subject}"`);
  return link;
}
