import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

/**
 * Validated environment variables.
 *
 * Every setting the app reads lives here. The app refuses to start when a required
 * value is missing or malformed. Set `SKIP_ENV_VALIDATION=1` only for builds that
 * don't need real values (for example the Docker build stage).
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    DATABASE_URL: z.url(),

    BETTER_AUTH_SECRET: z.string().min(32),
    /** Comma-separated emails of operators who can open /admin (verified accounts only). */
    ADMIN_EMAILS: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("Comeby <hello@comeby.org>"),
    /** Signing secret (`whsec_...`) for Resend's bounce and complaint webhook. Webhook is off when unset. */
    RESEND_WEBHOOK_SECRET: z.string().optional(),
    /** Bearer secret for the generic bounce webhook, for SMTP providers. Webhook is off when unset. */
    EMAIL_WEBHOOK_SECRET: z.string().min(16).optional(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".data/uploads"),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.url().optional(),

    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default("mailto:hello@comeby.org"),

    TURNSTILE_SECRET_KEY: z.string().optional(),

    /** Sentry-compatible DSN (Sentry or self-hosted GlitchTip). Error reporting is off when unset. */
    ERROR_REPORTING_DSN: z.url().optional(),

    JOBS_ENABLED: booleanString.default(true),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: booleanString.default(false),
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.url().optional(),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});
