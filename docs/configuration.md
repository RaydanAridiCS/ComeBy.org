# Configuration

All settings are environment variables, validated at startup by `src/env.ts`. If a required one is missing, the app refuses to start and says which. Copy `.env.example` to `.env.local` for development.

`NEXT_PUBLIC_*` variables are embedded in browser code **at build time**. In Docker, pass them as build args. `S3_PUBLIC_URL` is also read at build time (it sets the allowed image host and the Content-Security-Policy), so pass it as a build arg too.

## App

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes (prod) | `http://localhost:3000` | Public URL, e.g. `https://comeby.org`. Used in links, emails and cookies. |
| `LOG_LEVEL` | | `info` | `fatal` … `trace` |
| `JOBS_ENABLED` | | `true` | `false` runs jobs inline (debugging only). Scheduled jobs never run in this mode, so guest reminders, the daily digest and the data purge are not sent. |
| `SKIP_ENV_VALIDATION` | | | `1` only for builds that don't need real values |
| `SKIP_STARTUP_TASKS` | | | `1` skips migrations and workers at startup |

## Database and auth

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | yes | 32+ random characters (`openssl rand -base64 32`). Also salts IP hashes. |
| `ADMIN_EMAILS` | | Comma-separated emails of operators who can open `/admin` (the moderation queue). The account must have a verified email. Those addresses also get an email when an event is hidden automatically after reports. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Enables "Sign in with Google". Redirect URI: `<APP_URL>/api/auth/callback/google` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | | `true` to show the Google button |

## Email

| Variable | Default | Notes |
|---|---|---|
| `EMAIL_PROVIDER` | `console` | `console` (log only), `smtp`, or `resend` |
| `EMAIL_FROM` | `Comeby <hello@comeby.org>` | Must be a verified sender with your provider |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | | For `smtp` (Mailpit locally: `localhost:1025`) |
| `RESEND_API_KEY` | | For `resend` |
| `RESEND_WEBHOOK_SECRET` | | Signing secret (`whsec_...`) of a Resend webhook pointing at `<APP_URL>/api/email/webhook/resend`, subscribed to `email.bounced` and `email.complained`. The webhook is off when unset. |
| `EMAIL_WEBHOOK_SECRET` | | 16+ character secret for `POST <APP_URL>/api/email/webhook/generic` with `Authorization: Bearer <secret>` and `{ "type": "bounced" \| "complained", "email": "..." }`. Lets SMTP providers (SES, Postmark...) report bad addresses. Off when unset. |

### Unsubscribes and bounces

Guest emails about event changes and host alert emails carry an unsubscribe link and `List-Unsubscribe` headers (one-click, RFC 8058), so mail apps show an "Unsubscribe" button. A guest who unsubscribes is added to the suppression list; a host who unsubscribes has their email alerts switched off (they can switch them back on in settings). Hard bounces and spam complaints reported by the webhooks above also join the suppression list, and those addresses never receive email again, not even a password reset. Emails people asked for directly (confirm email, reset password, RSVP receipt) still go to unsubscribed addresses. The suppression list is kept after guest data is purged, otherwise an opt-out would be forgotten.

## File storage

| Variable | Default | Notes |
|---|---|---|
| `STORAGE_PROVIDER` | `local` | `local` (disk, served at `/uploads`) or `s3` |
| `STORAGE_LOCAL_DIR` | `.data/uploads` | |
| `S3_ENDPOINT` | | R2: `https://<account>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` | |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | | |
| `S3_PUBLIC_URL` | | Public base URL of the bucket, e.g. `https://cdn.comeby.org` |

## Push, bots, analytics

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`. Push is off when unset. |
| `VAPID_SUBJECT` | `mailto:` contact for push services |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile. Bot checks are off when unset. |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Self-hosted Umami analytics (optional) |

## Security headers

Every response carries a Content-Security-Policy built in `src/config/csp.ts`. It allows only Cloudflare Turnstile, your Umami host and your public file bucket (`S3_PUBLIC_URL`) beyond the app itself. Set `CSP_REPORT_ONLY=1` to switch it to report-only mode (violations show in the browser console but nothing is blocked), handy when trying a new third-party service.

## Error reporting

| Variable | Notes |
|---|---|
| `ERROR_REPORTING_DSN` | Sentry-compatible DSN, e.g. from a self-hosted GlitchTip project (`https://<key>@errors.example.com/<project>`). Reporting is off when unset. |

Server, background-job and browser errors are sent to this DSN over plain HTTP (no SDK). Only the error type, a scrubbed message (emails, phone numbers and token-like strings removed), the route pattern such as `/[slug]`, and a few tags are sent. Never request bodies, headers, cookies, query strings or user data. Outgoing reports are capped at 30 per minute per process, and browser reports at 20 per hour per network.
