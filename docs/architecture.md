# Architecture

Comeby is one Next.js application backed by one PostgreSQL database. The web server also runs the background workers, which is plenty for a single-server deployment.

```
Browser ──► Next.js (pages, server actions, route handlers)
               │
               ├─► services       business rules + free-tier limits
               │      │
               │      ├─► repositories ──► PostgreSQL (Drizzle)
               │      └─► job queue ─────► pg-boss (also in PostgreSQL)
               │                              │
               └─► adapters ◄─────────────────┘  workers: email, push, digests, clean-up
                   email · storage · push
```

## Folder structure

```
src/
  app/                 Routes only: pages, layouts, route handlers. Thin; no business logic.
    (auth)/            Sign in, sign up, password reset
    dashboard/         Host area (events, event dashboard, settings)
    [slug]/            Public invite page + preview image, calendar file, QR code
    api/               Auth handler, dashboard live data, CSV export, health check
    r/[credential]/    Guests' private "change my response" links
    uploads/[...key]/  Serves cover images when using local storage
  features/            UI + server actions grouped by feature
    auth/  dashboard/  events/  rsvp/  settings/
  server/
    services/          Business rules and hard limits (framework-free, unit-tested)
    repositories/      Database access only: interfaces + Drizzle implementations
    adapters/          Swappable providers: email, storage, push
    jobs/              pg-boss queue, job types, worker registration
    auth/              Better Auth configuration and session helpers
    security/          Hashing, client IP, Turnstile
    actions/           `runAction`: turns errors into translated results
  db/                  Drizzle schema, client and migration runner
  emails/              React Email templates
  themes/              The five invite themes (tokens + decorations)
  i18n/                next-intl setup and message catalogues
  config/              Limits and site constants
  components/          Shared UI (shadcn/ui in components/ui)
  lib/                 Pure helpers: dates, slugs, calendar, share links…
  sw/                  Service worker (TypeScript, built to public/sw.js)
drizzle/               Generated SQL migrations
tests/unit/            Vitest
tests/e2e/             Playwright
```

## Layers and rules

1. **Routes and components** render and collect input. They call **server actions** (`features/*/actions.ts`) or read through services.
2. **Server actions** authenticate (`requireUser`), validate with Zod, call a service, then refresh caches. Every action is wrapped in `runAction`, which turns thrown `AppError`s into a translated `ActionResult`, so forms never see stack traces.
3. **Services** (`createEventService(deps)` and so on) hold every business rule: ownership checks, hard limits, notable-change detection, rate limits. They receive their dependencies (`repos`, `transaction`, `jobs`, `now`), so tests swap in in-memory fakes (`tests/unit/support/fakes.ts`).
4. **Repositories** are the only code that imports Drizzle. Each one is a small interface (`server/repositories/interfaces.ts`) with a Drizzle implementation. There is no generic `BaseRepository`.
5. **Adapters** wrap outside services behind tiny interfaces. Changing email provider, for example, is a one-line environment change.

## Caching and rendering (Cache Components)

Next.js 16 runs with `cacheComponents: true`:

- Pages render a **static shell** instantly; anything that reads the request (cookies, session, fresh counts) sits inside `<Suspense>` and streams in.
- The public event behind a link is cached with `"use cache"` (`features/events/queries.ts`) and tagged `event:<id>`. Every host change calls `updateTag(...)`, so guests see edits immediately.
- Guest counts, the guest's own response and everything on the dashboard are never cached.
- Chat apps' link-preview bots (WhatsApp, Telegram…) get a blocking render with metadata in `<head>` (`htmlLimitedBots` in `next.config.ts`).

## Guests without accounts

When a guest responds, the server creates a random secret and stores only its SHA-256 hash. The guest's browser keeps `rsvpId.secret` in an httpOnly cookie for that event, so they can change their answer later. If they left an email, the confirmation email contains `/r/<rsvpId.secret>`, which restores the cookie on any device.

## Background jobs

`pg-boss` keeps jobs in Postgres (schema `pgboss`). Workers start in `src/instrumentation.ts` right after migrations run:

| Job | When |
|---|---|
| `email.send` | Every email (retried 3× with backoff) |
| `host.rsvp-alert` | After each response: push + email, respecting settings and the 50/day quota |
| `guests.event-update` | When a host changes the time, place or details, or cancels |
| `guests.reminders-due` | Every 15 minutes: one reminder to going and maybe guests in the 24 hours before an event ([ADR 0011](adr/0011-reminders-by-sweep.md)) |
| `guests.nudge` | When a host sends the one-time nudge to "maybe" guests and pasted addresses |
| `hosts.daily-digest` | Daily at 18:00 UTC |
| `privacy.purge-guest-data` | Daily: deletes guests' phone and email, and pasted invitee addresses, 90 days after events end |
| `maintenance.cleanup-rate-limits` | Hourly |

With `JOBS_ENABLED=false`, jobs run inline in the request instead (useful for debugging).

## Dates and time zones

- Instants are stored in UTC; each event also stores its IANA time zone.
- Hosts type local wall-clock time; `zonedInputToDate` converts it using the event's zone (DST-safe).
- Invites, emails and preview cards show times in the **event's** zone, labelled (for example "GMT+3"). Dashboards show timestamps in the **viewer's** zone.

## Limits and abuse

All free-tier numbers live in `src/config/limits.ts` (mirrored in the business plan). Services enforce them and throw `LimitReachedError`; the UI shows a friendly translated message. Counters use the `rate_limits` table (fixed windows). Other protections: link-only events, Turnstile on RSVPs, Better Auth rate limits, sign-ups per network per day, and automatic hiding after 3 reports.

## Security notes

- Every server action and route handler re-checks the session and ownership; UI checks are never trusted.
- Guest phone numbers, emails and messages are only returned to the event's host.
- IP addresses are only stored as keyed hashes (`hmac`).
- CSV exports neutralise spreadsheet formulas; storage keys are validated against a strict pattern.
- Logs redact emails, phones, passwords and tokens.
