import "server-only";

import { render } from "react-email";
import type { RenderableEmail } from "@/emails/templates";
import type { JobQueue } from "../jobs/types";

export type RenderedEmail = { subject: string; html: string; text: string };

export async function renderEmail(email: RenderableEmail): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(email.element),
    render(email.element, { plainText: true }),
  ]);
  return { subject: email.subject, html, text };
}

/** Renders an email now and queues it for delivery (retried automatically on failure). */
export async function queueEmail(
  jobs: JobQueue,
  to: string,
  email: RenderableEmail,
): Promise<void> {
  const rendered = await renderEmail(email);
  await jobs.enqueue("email.send", { to, ...rendered });
}
