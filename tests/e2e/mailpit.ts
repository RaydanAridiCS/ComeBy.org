const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
type MailpitMessage = { Text: string; HTML: string; Subject: string };

/** Waits for an email to `to` whose subject contains `subject`, and returns it. */
export async function waitForEmail(
  to: string,
  subject: string,
  timeoutMs = 30_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    if (response.ok) {
      const result = (await response.json()) as MailpitSearch;
      const match = result.messages.find((message) => message.Subject.includes(subject));
      if (match) {
        const message = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        return (await message.json()) as MailpitMessage;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email to ${to} with subject containing "${subject}"`);
}

/** First link in an email's text body that contains `fragment`. */
export function findLink(message: MailpitMessage, fragment: string): string {
  const links = message.Text.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  const link = links.find((candidate) => candidate.includes(fragment));
  if (!link) throw new Error(`No link containing "${fragment}" in email "${message.Subject}"`);
  return link;
}
