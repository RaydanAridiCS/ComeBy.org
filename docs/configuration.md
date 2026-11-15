# Configuration

All settings are environment variables, validated at startup by `src/env.ts`. If a required one is missing, the app refuses to start and says which. Copy `.env.example` to `.env.local` for development.

## Build time and run time

`NEXT_PUBLIC_*` variables are embedded in browser code **at build time**. In Docker, pass them as build args; setting them only on the running container changes the server but not the browser code. Two more are read by `next.config.ts` while building:

- `S3_PUBLIC_URL` sets the allowed image host and the Content-Security-Policy. The Dockerfile has a build arg for it. Set it at run time as well, because the storage adapter uses it to build image URLs.
- `CSP_REPORT_ONLY` (see [Security headers](#security-headers)). The Dockerfile has a build arg for it (`--build-arg CSP_REPORT_ONLY=1`); for a build you run yourself, use `CSP_REPORT_ONLY=1 pnpm run build`.

Everything else is read when the server starts.

## App

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | in production | `http://localhost:3000` | Public URL, e.g. `https://comeby.org`. Used in links, emails and cookies. Nothing checks that you set it: an unset value silently falls back to the default (and the Dockerfile's build arg defaults to `https://comeby.org`), so set it on purpose, at build time and run time. |
| `NODE_ENV` | | `development` | Set to `production` by the Docker image. Also sent as the environment name in error reports. |
| `LOG_LEVEL` | | `info` | `fatal` … `trace` |
| `JOBS_ENABLED` | | `true` | `false` runs jobs inline (debugging only). Scheduled jobs never run in this mode, so guest reminders, the daily digest and the data purge are not sent. |
| `SKIP_ENV_VALIDATION` | | | `1` only for builds that don't need real values |
| `SKIP_STARTUP_TASKS` | | | `1` skips migrations and workers at startup |
| `PORT`, `HOSTNAME` | | `3000`, `0.0.0.0` in the Docker image | Where the standalone server listens. Standard Next.js variables, set by the Dockerfile. |

## Database and auth

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | yes | 32+ random characters (`openssl rand -base64 32`). Besides signing sessions, it is the key for hashed IP addresses and for unsubscribe links. See [Rotating the secret](#rotating-the-secret). |
| `ADMIN_EMAILS` | | Comma-separated emails of operators who can open `/admin` (the moderation queue). The account must have a verified email. Those addresses also get an email when an event is hidden automatically after reports. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Enables "Sign in with Google". Redirect URI: `<APP_URL>/api/auth/callback/google` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | | `true` to show the Google button. Build-time, like every `NEXT_PUBLIC_*` value. |

### Rotating the secret

Changing `BETTER_AUTH_SECRET` has three effects beyond signing everyone out:

- Unsubscribe links in emails that were already sent stop working (they are signed with it). The page shows an invalid-link message.
- Hashed network addresses change, so per-network counters (sign-ups per day, reports, browser error reports) start again from zero, and a network that already reported an event could report it once more.
- Guests' edit links are **not** affected: those are plain SHA-256 hashes of a random secret.

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

The full email system is described in [email.md](email.md). In short: guest emails about event changes and host alert emails carry an unsubscribe link and `List-Unsubscribe` headers (one-click, RFC 8058), so mail apps show an "Unsubscribe" button. A guest who unsubscribes is added to the suppression list; a host who unsubscribes has their email alerts switched off (they can switch them back on in settings). Hard bounces and spam complaints reported by the webhooks above also join the suppression list, and those addresses never receive email again, not even a password reset. Emails people asked for directly (confirm email, reset password, RSVP receipt) still go to unsubscribed addresses. The suppression list is kept after guest data is purged, otherwise an opt-out would be forgotten.

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `pnpm exec web-push generate-vapid-keys`. Push is off when unset. |
| `VAPID_SUBJECT` | `mailto:` contact for push services. Defaults to `mailto:hello@comeby.org`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile. Bot checks are off when unset. |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Self-hosted Umami analytics (optional) |

## Security headers

Every response carries a Content-Security-Policy built in `src/config/csp.ts`. It allows only Cloudflare Turnstile, your Umami host and your public file bucket (`S3_PUBLIC_URL`) beyond the app itself. Set `CSP_REPORT_ONLY=1` **when building** to switch it to report-only mode (violations show in the browser console but nothing is blocked), handy when trying a new third-party service. It has no effect on an image that is already built.

## Error reporting

| Variable | Notes |
|---|---|
| `ERROR_REPORTING_DSN` | Sentry-compatible DSN, e.g. from a self-hosted GlitchTip project (`https://<key>@errors.example.com/<project>`). Reporting is off when unset. |

Server, background-job and browser errors are sent to this DSN over plain HTTP (no SDK). Only the error type, a scrubbed message (emails, phone numbers and token-like strings removed), the route pattern such as `/[slug]`, and a few tags are sent. Never request bodies, headers, cookies, query strings or user data. Outgoing reports are capped at 30 per minute per process, and browser reports at 20 per hour per network.

## Docker compose

These are read by the compose files, not by the app.

| Variable | File | Notes |
|---|---|---|
| `POSTGRES_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` | `docker-compose.yml` | Change the local ports when the defaults (5432, 1025, 8025) are taken. |
| `POSTGRES_PASSWORD` | `docker-compose.prod.yml` | Required by that file. See [deployment.md](deployment.md#about-docker-composeprodyml). |

## Tests only

| Variable | Used by | Notes |
|---|---|---|
| `E2E_BASE_URL` | Playwright | Where the app under test runs. When unset, Playwright starts `pnpm run dev` on port 3000, or reuses whatever already answers there. |
| `E2E_ADMIN_EMAIL` | `tests/e2e/admin.spec.ts` | Runs the admin tests. Start the app with `ADMIN_EMAILS` set to the same address. |
| `MAILPIT_URL` | `tests/e2e/mailpit.ts` | Mailpit's API, when it isn't on the default port. |
| `DATABASE_URL` | `tests/e2e/support.ts` | The e2e helpers write test data straight to the database, so this must be the same database the app under test uses. |
| `TEST_DATABASE_ADMIN_URL` | integration tests | A Postgres connection allowed to create and drop the throwaway `comeby_integration` database. Defaults to the docker compose one. |

More in [testing.md](testing.md).
