/**
 * Sends one test email with your Resend settings, to check they work.
 *
 *   npx tsx scripts/send-test-email.ts you@example.com
 *
 * Reads .env.local then .env (same priority as Next.js). Never prints the API key.
 */
import { existsSync } from "node:fs";
import { Resend } from "resend";

async function main(): Promise<void> {
  // process.loadEnvFile never overrides variables that are already set, so loading
  // .env.local first gives it priority over .env, just like Next.js.
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }

  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: npx tsx scripts/send-test-email.ts you@example.com");
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Comeby <hello@comeby.org>";
  console.log(`EMAIL_PROVIDER = ${process.env.EMAIL_PROVIDER ?? "(not set)"}`);
  console.log(`EMAIL_FROM     = ${from}`);
  console.log(`RESEND_API_KEY = ${apiKey ? "set" : "MISSING"}`);
  if (!apiKey) process.exit(1);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Comeby test email ✅",
    text: "If you can read this, Comeby can send emails through Resend.",
    html: "<p>If you can read this, <strong>Comeby</strong> can send emails through Resend. ✅</p>",
  });

  if (error) {
    console.error(`\n❌ Resend refused the email: ${error.name}: ${error.message}`);
    if (/domain/i.test(error.message)) {
      console.error(
        '   Your sending domain isn\'t verified yet. Verify it in Resend → Domains, or for testing set\n   EMAIL_FROM="Comeby <onboarding@resend.dev>" (it can only send to your own Resend account email).',
      );
    }
    process.exit(1);
  }
  console.log(`\n✅ Sent! Resend email id: ${data?.id}. Check the inbox (and spam) of ${to}.`);
}

void main();
