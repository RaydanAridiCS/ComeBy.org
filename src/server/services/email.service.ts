import "server-only";

import { render } from "react-email";
import type { RenderableEmail } from "@/emails/templates";
import type { JobQueue } from "../jobs/types";
import {
  type UnsubscribeScope,
  unsubscribeOneClickUrl,
  unsubscribePageUrl,
} from "../security/unsubscribe-token";
import type { EmailCategory } from "./suppression.service";

export type RenderedEmail = { subject: string; html: string; text: string };

export async function renderEmail(email: RenderableEmail): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(email.element),
    render(email.element, { plainText: true }),
  ]);
  return { subject: email.subject, html, text };
}

/** The two links an unsubscribe needs: one for the email body, one for the mail client's button. */
export function unsubscribeLinks(scope: UnsubscribeScope, email: string) {
  return { page: unsubscribePageUrl(scope, email), oneClick: unsubscribeOneClickUrl(scope, email) };
}

export type QueueEmailOptions = {
  /** Defaults to `transactional`. See `EmailCategory`. */
  category?: EmailCategory;
  /** Adds the `List-Unsubscribe` headers so mail apps can show an "Unsubscribe" button. */
  oneClickUnsubscribeUrl?: string;
};

/** Renders an email now and queues it for delivery (retried automatically on failure). */
export async function queueEmail(
  jobs: JobQueue,
  to: string,
  email: RenderableEmail,
  options: QueueEmailOptions = {},
): Promise<void> {
  const rendered = await renderEmail(email);
  await jobs.enqueue("email.send", {
    to,
    ...rendered,
    category: options.category ?? "transactional",
    ...(options.oneClickUnsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${options.oneClickUnsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  });
}
