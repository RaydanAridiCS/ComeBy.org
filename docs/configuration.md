# Configuration

All settings are environment variables, validated at startup by `src/env.ts`. If a required one is missing, the app refuses to start and says which. Copy `.env.example` to `.env.local` for development.

`NEXT_PUBLIC_*` variables are embedded in browser code **at build time**. In Docker, pass them as build args.

## App

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes (prod) | `http://localhost:3000` | Public URL, e.g. `https://comeby.org`. Used in links, emails and cookies. |
| `LOG_LEVEL` | | `info` | `fatal` … `trace` |
| `JOBS_ENABLED` | | `true` | `false` runs jobs inline (debugging only) |
| `SKIP_ENV_VALIDATION` | | | `1` only for builds that don't need real values |
| `SKIP_STARTUP_TASKS` | | | `1` skips migrations and workers at startup |

## Database and auth

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | yes | 32+ random characters (`openssl rand -base64 32`). Also salts IP hashes. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Enables "Sign in with Google". Redirect URI: `<APP_URL>/api/auth/callback/google` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | | `true` to show the Google button |

## Email

| Variable | Default | Notes |
|---|---|---|
| `EMAIL_PROVIDER` | `console` | `console` (log only), `smtp`, or `resend` |
| `EMAIL_FROM` | `Comeby <hello@comeby.org>` | Must be a verified sender with your provider |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | | For `smtp` (Mailpit locally: `localhost:1025`) |
| `RESEND_API_KEY` | | For `resend` |

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
