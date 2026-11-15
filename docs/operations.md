# Operations

How to keep comeby.org running once it is deployed. Setting it up is in [deployment.md](deployment.md).

## What is running

One container holds everything: the Next.js server, the database migrations that run at startup, and the background workers. One PostgreSQL database holds the application data, the job queue (schema `pgboss`) and the rate-limit counters. Cover images are in an R2 bucket.

So there are three things that can be lost: the database, the bucket, and the environment variables.

## Health check

`GET /api/health` runs `select 1` against the database.

- `200 {"status":"ok"}` when the app and the database are reachable.
- `503 {"status":"error","database":"unreachable"}` otherwise.

The Docker image has a `HEALTHCHECK` on it, and Coolify uses the same path.

It does **not** check the background workers. If the workers failed to start, the health check stays green while no email goes out. Signs of that: a `Startup failed` line at fatal level in the logs, no `Background workers started` line after a deploy, or guests reporting no confirmation email.

## Logs

The app writes JSON lines to stdout (pino); read them in Coolify. Every line has `app: "comeby"`.

- `LOG_LEVEL` sets the detail (`info` by default).
- Fields named `email`, `phone`, `password` and `token` are replaced with `[redacted]`, at the top level and one level down. Do not log personal data under other names.
- Server errors are logged as `Request error` with the route pattern and method. Failed jobs are logged as `Job failed` with the job name.

Lines worth knowing:

| Line | Meaning |
|---|---|
| `Database migrations are up to date` | Startup reached the database and applied any new migrations |
| `Background workers started` | Jobs will run |
| `Background jobs disabled (JOBS_ENABLED=false)` | Jobs run inline and scheduled jobs never run. Wrong for production |
| `Email skipped: address is suppressed` | Working as intended |
| `Event auto-hidden after reports; needs review` | Open `/admin` ([admin.md](admin.md)) |
| `Purged guest contact details` | The nightly 90-day purge found events to clean |

## Error reporting

Set `ERROR_REPORTING_DSN` to a Sentry-compatible project (for example self-hosted GlitchTip). Server errors, failed jobs and browser errors are then reported with the error type, a scrubbed message, the route pattern and a few tags. Request bodies, headers, cookies, query strings and user data are never sent ([ADR 0008](adr/0008-error-reporting-without-sdk.md)).

Reports are capped at 30 per minute per process, so a crash loop shows up as one busy issue rather than a flood. Without a DSN, errors are only in the logs.

## Backups

**Database.** In Coolify, enable scheduled backups for the PostgreSQL database, daily, to an S3 destination (a separate R2 bucket such as `comeby-backups`).

- **Keep backups for 30 days at most.** The privacy policy tells users "Backups are overwritten within 30 days", and the 90-day purge of guest contact details only means something if old copies also disappear. Set the retention in Coolify, and a lifecycle rule on the bucket as a second guard.
- The backup contains guests' phone numbers and emails. Keep the bucket private.

**Cover images.** These live in the uploads bucket, not in the database. R2 is durable, but a deleted bucket or a bad script is not something R2 protects against. Losing covers is not fatal (invites fall back to their theme art), so decide deliberately whether to copy the bucket.

**Environment variables.** Keep a copy of the production values in a password manager. `BETTER_AUTH_SECRET` matters most: losing it signs everyone out, breaks unsubscribe links in sent emails and resets per-network counters ([configuration.md](configuration.md#rotating-the-secret)).

### Testing a restore

A backup that has never been restored is a guess. Before launch, and after any change to how backups are made:

1. Restore the latest backup into a new, empty database (in Coolify, or with `pg_restore` / `psql` depending on the backup format).
2. Start a copy of the app pointed at it, with `EMAIL_PROVIDER=console` so nothing is emailed, and on a URL that isn't the real one.
3. Sign in and open an event. Check that responses and the activity timeline are there.
4. Delete the copy and the restored database.

Remember that a restored database also restores the job queue. Jobs that were waiting at backup time will run again, which is one more reason for `EMAIL_PROVIDER=console` during a test.

## Monitoring

Nothing in the repository sets these up; they are done once by hand.

- An **uptime check** on `https://comeby.org/api/health` every minute or so (Uptime Kuma, Beszel or any hosted checker), alerting somewhere you will see.
- **Server metrics**: a Beszel agent on the VPS for CPU, memory and disk. Disk matters most, because PostgreSQL stops when it is full.
- **Cost**: the business plan sets $100 a month as the point to rethink funding. Check the VPS, R2 and email bills monthly.
- **Email reputation**: watch the provider's bounce and complaint rates. A working bounce webhook ([email.md](email.md#bounce-and-complaint-webhooks)) keeps them low.

## Deploying an update

Push to `main`; Coolify builds the Dockerfile and replaces the container.

- Migrations run when the new container starts, before it serves traffic. If the database isn't reachable yet, startup retries five times with growing pauses, then fails.
- Migrations only go forward. If a deploy has to be rolled back to the previous image, the database stays on the new schema. Write migrations so the previous version of the app still works against them (add columns before using them; remove them a release later).
- Changing any `NEXT_PUBLIC_*` value, `S3_PUBLIC_URL` or `CSP_REPORT_ONLY` needs a rebuild, not a restart.
- Changing `ADMIN_EMAILS` or any other runtime variable needs a restart.
- A job that was running when the container stopped is not lost: pg-boss marks it as expired once it times out and retries it.

## Routine tasks

| Task | How |
|---|---|
| Review reported events | `/admin`, see [admin.md](admin.md) |
| Stop emailing an address | It happens automatically on a bounce, complaint or unsubscribe. To add one by hand: `insert into email_suppressions (email, reason) values ('person@example.com', 'complained')` (lower-case address) |
| Let a suppressed address receive email again | `delete from email_suppressions where email = '...'`. Only do this when the person asked |
| Clear rate-limit counters | `delete from rate_limits` (they also expire on their own and are cleaned hourly) |
| Change who the operators are | Edit `ADMIN_EMAILS` and restart |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Startup fails with a connection error and a hint about `localhost` | `DATABASE_URL` points at `localhost` inside a container. Use the database's internal hostname |
| App refuses to start, naming a variable | `src/env.ts` validation: a required value is missing or malformed |
| No emails at all | `EMAIL_PROVIDER` is `console` (the default), or workers did not start |
| Emails to one person never arrive | The address is on the suppression list |
| Links in emails point at the wrong host | `NEXT_PUBLIC_APP_URL` had the wrong value when the image was built. It is baked in, so fix the build variable and rebuild |
| Cover images don't load | `S3_PUBLIC_URL` wasn't passed at build time, so the Content-Security-Policy blocks the bucket's host |
| Google button is missing | `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` wasn't `true` at build time |
| `/admin` shows "not found" | The account's email isn't in `ADMIN_EMAILS`, or isn't verified |
| Every visitor seems to share one rate limit | The app isn't seeing real client addresses. Check that Cloudflare is proxying and that the proxy passes `cf-connecting-ip` or `x-forwarded-for` |
| Reminders or the daily digest never go out | `JOBS_ENABLED=false`, or workers did not start |
