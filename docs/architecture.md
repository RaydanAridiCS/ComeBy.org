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
    admin/             Operator moderation queue (allowlisted emails only)
    [slug]/            Public invite page + preview image, calendar file, QR code
    r/[credential]/    Guests' private "change my response" links
    unsubscribe/       Confirmation page for email unsubscribe links
    privacy/  terms/   Legal pages
    api/               Auth handler, dashboard live data, exports, webhooks, health check
    uploads/[...key]/  Serves cover images when using local storage
  features/            UI + server actions grouped by feature
    admin/  auth/  dashboard/  events/  marketing/  rsvp/  settings/  unsubscribe/
  server/
    services/          Business rules and hard limits (framework-free, unit-tested)
    repositories/      Database access only: interfaces + Drizzle implementations
    adapters/          Swappable providers: email, storage, push
    jobs/              pg-boss queue, job types, worker registration
    auth/              Better Auth configuration, session helpers, admin policy
    security/          Hashing, client IP, Turnstile, unsubscribe tokens, webhook signatures
    monitoring/        Error reporting to a Sentry-compatible server
    actions/           `runAction`: turns errors into translated results
  db/                  Drizzle schema, client and migration runner
  emails/              React Email templates
  themes/              The ten invite themes (tokens + decorations)
  i18n/                next-intl setup and message catalogues
  config/              Limits, site constants, Content-Security-Policy, SEO rules
  components/          Shared UI (shadcn/ui in components/ui)
  lib/                 Pure helpers: dates, slugs, calendar, share links…
  sw/                  Service worker (TypeScript, built to public/sw.js)
drizzle/               Generated SQL migrations
tests/unit/            Vitest, services against in-memory fakes
tests/integration/     Vitest, repositories and services against real Postgres
tests/e2e/             Playwright
```

Every page and route handler is listed in [routes.md](routes.md), and every table in [data-model.md](data-model.md).

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
- The public header (`src/components/layout/site-header.tsx`) shows "My events" to a signed-in host. Only its button corner reads the session, inside `<Suspense>` with the signed-out buttons as the fallback, so the landing and legal pages are still served from a prebuilt shell (◐ in the build output, `x-nextjs-prerender: 1`). The cost: those pages' HTML is no longer cacheable as a whole (`Cache-Control: private, no-store`), and each request does a small render for that corner.
- Chat apps' link-preview bots (WhatsApp, Telegram…) get a blocking render with metadata in `<head>` (`htmlLimitedBots` in `next.config.ts`).
- **A page is not thrown away when the host leaves it.** Next.js keeps up to three pages alive, hidden, and shows the same one again on the next visit, with its state, form values and scroll position. That is why a half-written event survives going to another page and back. It also means a client component must tidy up what should not come back: effects are cleaned up when a page is hidden and run again when it is shown, so do the tidying in an effect cleanup. The event form does this after a save (`afterSave` in `src/features/events/components/event-form.tsx`); without it, "New event" would open with the previous event's details.

## Guests without accounts

When a guest responds, the server creates a random secret and stores only its SHA-256 hash. The guest's browser keeps `rsvpId.secret` in an httpOnly cookie for that event, so they can change their answer later. If they left an email, the confirmation email contains `/r/<rsvpId.secret>`, which restores the cookie on any device. See [ADR 0004](adr/0004-guests-without-accounts.md).

The same credential lets a guest download or delete their own response from the invite page. Deleting also removes their name from the host's activity timeline. Details are in [privacy-and-data.md](privacy-and-data.md).

## Host accounts

Better Auth handles email and password sign-in with verified emails, plus optional Google sign-in ([ADR 0012](adr/0012-better-auth.md)). From settings a host can change their name, password and email (two steps: the current address approves, then the new one is verified), see and revoke sessions, download their data and delete the account. Sessions are looked up in the database on every request, so revoking one takes effect immediately.

A confirmation link lands a new host in the new-event form when they have no events yet (`/dashboard/start`, see [routes.md](routes.md)); their first event form has a short tip until they close it. After "Create", the event page opens with the "your invite is ready" panel, so the first run ends on sharing.

## Background jobs

`pg-boss` keeps jobs in Postgres (schema `pgboss`). Workers start in `src/instrumentation.ts` right after migrations run. They send every email, alert hosts, email guests about changes, send reminders and the one-time nudge, send the daily digest, purge guest contact details after 90 days and clean up rate-limit counters.

The full list with schedules, retries and how to add a job is in [background-jobs.md](background-jobs.md).

## Email

Templates are React Email components rendered to HTML and plain text. Each email has a category (`transactional`, `guest-update` or `host-alert`) that decides whether an unsubscribe stops it. A suppression list holds addresses that unsubscribed, bounced or complained. See [email.md](email.md).

## Moderation

Every invite has a report button. After 3 reports from different networks an event is hidden automatically and operators are emailed. Operators are the addresses in `ADMIN_EMAILS`; they review hidden events at `/admin` and either restore or delete them, and each action is written to an audit log. See [admin.md](admin.md).

## Dates and time zones

- Instants are stored in UTC; each event also stores its IANA time zone.
- Hosts type local wall-clock time; `zonedInputToDate` converts it using the event's zone (DST-safe).
- Invites, emails and preview cards show times in the **event's** zone, labelled (for example "GMT+3"). Dashboards show timestamps in the **viewer's** zone.

## Limits and abuse

All free-tier numbers live in `src/config/limits.ts` (mirrored in the business plan). Services enforce them and throw `LimitReachedError`; the UI shows a friendly translated message. Counters use the `rate_limits` table (fixed windows). Other protections: link-only events, Turnstile on sign-up, password reset and RSVPs, Better Auth rate limits, sign-ups per network per day, and automatic hiding after 3 reports.

## Security notes

The full picture is in [security.md](security.md). In short:

- Every server action and route handler re-checks the session and ownership; UI checks are never trusted.
- Guest phone numbers, emails and messages are only returned to the event's host.
- IP addresses are only stored as keyed hashes (HMAC with `BETTER_AUTH_SECRET`).
- CSV exports neutralise spreadsheet formulas; storage keys are validated against a strict pattern.
- Logs redact emails, phones, passwords and tokens. Error reports carry the route pattern, never the real URL.
