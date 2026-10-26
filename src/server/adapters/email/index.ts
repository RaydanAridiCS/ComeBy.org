import "server-only";

import { env } from "@/env";
import { logger } from "@/lib/logger";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, such as `List-Unsubscribe`. */
  headers?: Record<string, string>;
};

/** Anything that can deliver an email. Pick one with `EMAIL_PROVIDER`. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Prints emails to the server log. Default when nothing is configured. */
function createConsoleSender(): EmailSender {
  return {
    async send(message) {
      logger.info(
        { to: "[redacted]", subject: message.subject, preview: message.text.slice(0, 500) },
        "📧 Email (console provider, not actually sent)",
      );
    },
  };
}

/** Any SMTP server: Mailpit in development, or a provider such as Amazon SES. */
async function createSmtpSender(): Promise<EmailSender> {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST ?? "localhost",
    port: env.SMTP_PORT ?? 1025,
    secure: (env.SMTP_PORT ?? 1025) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } : undefined,
  });
  return {
    async send(message) {
      await transport.sendMail({ from: env.EMAIL_FROM, ...message });
    },
  };
}

/** Resend (https://resend.com), free for 3,000 emails per month. */
async function createResendSender(): Promise<EmailSender> {
  const { Resend } = await import("resend");
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  const resend = new Resend(env.RESEND_API_KEY);
  return {
    async send(message) {
      const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...message });
      if (error) throw new Error(`Resend failed: ${error.name}: ${error.message}`);
    },
  };
}

let senderPromise: Promise<EmailSender> | undefined;

export function getEmailSender(): Promise<EmailSender> {
  senderPromise ??= (async () => {
    switch (env.EMAIL_PROVIDER) {
      case "smtp":
        return createSmtpSender();
      case "resend":
        return createResendSender();
      default:
        return createConsoleSender();
    }
  })();
  return senderPromise;
}
