# Testing

There are three suites. Each one answers a different question, so a change usually needs tests in only one or two of them.

| Suite | Folder | Runs against | Answers |
|---|---|---|---|
| Unit | `tests/unit` | In-memory fakes, no database | Are the business rules and limits right? |
| Integration | `tests/integration` | A real, throwaway PostgreSQL database | Do the real queries do what the fakes pretend they do? |
| End-to-end | `tests/e2e` | The running app, PostgreSQL and Mailpit, in a real browser | Does the whole flow work for a host and a guest? |

`pnpm run check` runs lint, typecheck, the theme contrast check and the unit tests. CI also runs the other two suites.

## Unit tests

```bash
pnpm test                 # once
pnpm run test:watch       # while working
pnpm run test:coverage    # with a coverage report
```

- Services are built with `create…Service(deps)`, and tests pass in the in-memory repositories, fake job queue and fixed clock from `tests/unit/support/fakes.ts`. No database, no network.
- Coverage is measured on `src/server`, `src/lib`, `src/config` and the feature schemas: the code where a regression costs the most. Drizzle repositories and adapters are excluded because the integration tests cover them.
- `server-only` is aliased to an empty module so server code can be imported in Node.

When you add a repository method, add it to the fake as well, and keep the fake's behaviour the same as the real query. A fake that is more forgiving than the database hides bugs; when the two could differ (date arithmetic, locking, `ON CONFLICT`), write an integration test.

## Integration tests

```bash
docker compose up -d
pnpm run test:integration
```

- Before the run, `tests/integration/global-setup.ts` drops and creates a database called `comeby_integration`, applies every migration from `drizzle/`, and drops it again afterwards. Your development database is not touched.
- Test files run one at a time because they share that database.
- To use a different PostgreSQL server, set `TEST_DATABASE_ADMIN_URL` to a connection that may create and drop databases.

Use this suite for anything whose correctness depends on SQL: the reminder and purge queries, atomic claims, row locks, cascades.

## End-to-end tests

```bash
docker compose up -d
pnpm run test:e2e
```

Playwright drives Chromium through real flows: signing up (reading the confirmation link from Mailpit), creating an event, a guest responding, the host seeing it, edits, cancellation, account settings, guest privacy controls, reminders and the nudge, security headers, and accessibility.

- Two projects run every spec: **desktop** (Desktop Chrome) and **mobile** (Pixel 7). The admin spec runs on desktop only, because its tests share one account.
- Two workers at a time, no parallelism inside a file. Each test sends real emails and jobs.
- If `E2E_BASE_URL` is not set, Playwright starts `pnpm run dev` on port 3000, **or reuses whatever is already answering on port 3000**.
- The helpers in `tests/e2e/support.ts` (`signUpHost`, `createInvite`, `respondAsGuest`, `withDatabase`) cover the common steps. `createInvite` takes a theme: `createInvite(page, "Game night", { theme: "Midnight" })`.
- Tests mostly move with `page.goto`, which loads a fresh page. A host moves with links, and a page reached by a link can be one that was kept alive from before. When the behaviour depends on that (a form reopened after a save), click the link in the test. `withDatabase` writes straight to the database named by `DATABASE_URL`, so that variable must point at the same database the app under test is using.
- The admin tests are skipped unless `E2E_ADMIN_EMAIL` is set and the app was started with `ADMIN_EMAILS` set to the same address.

### Accessibility

`tests/e2e/accessibility.spec.ts` runs axe (`@axe-core/playwright`) against WCAG 2.0 A/AA and 2.2 AA rules, and fails on serious or critical violations. It covers the public pages, the not-found pages, the event list, the event page with responses, the new-event and edit forms, settings, the invite page in five themes (two of them dark), and both forms in their error state. A new screen or a new state of a screen (a dialog, an error state) should be added there.

`tests/e2e/forms.spec.ts` checks what axe cannot: that a failed submit marks the field, ties it to its message, and moves focus to it (also inside a collapsed section, and for an error that comes back from the server); that leaving the event form with unsaved changes asks first; and that "New event" opens blank after an event was created.

`tests/e2e/ergonomics.spec.ts` checks that the first Tab on a page shows "Skip to content" and that it moves focus into `<main>` (public pages, a not-found page, the event list, an invite), and, on the mobile project only, that every control on the main screens is at least 44 × 44 px, counting the invisible hit areas drawn with `::before`/`::after`. Text links inside a sentence are exempt, as WCAG allows.

The colour contrast of every invite theme is checked separately by `pnpm run check:contrast`.

### Running e2e safely

The defaults assume a clean machine. Three things can go wrong on a real one:

1. **Something else is on port 3000.** Playwright will silently test that instead, and every test fails at sign-up. Run the app on another port and set `E2E_BASE_URL`.
2. **Your `.env.local` sends real email.** With `EMAIL_PROVIDER=resend`, the tests would email real addresses and then fail, because they read from Mailpit. Override the provider for the test run.
3. **The tests fill your development database.** Use a throwaway one.

A run that avoids all three:

```bash
# 1. A throwaway database
docker compose exec postgres psql -U comeby -d postgres -c "CREATE DATABASE comeby_e2e"

# 2. Build and serve on another port, with Mailpit as the mail server
export DATABASE_URL=postgres://comeby:comeby@localhost:5432/comeby_e2e
export NEXT_PUBLIC_APP_URL=http://localhost:3100
export EMAIL_PROVIDER=smtp SMTP_HOST=localhost SMTP_PORT=1025
pnpm run build
PORT=3100 pnpm start &

# 3. Run the tests against it (same DATABASE_URL, so the helpers see the same data)
E2E_BASE_URL=http://localhost:3100 pnpm run test:e2e

# 4. Stop the server, then drop the database
docker compose exec postgres psql -U comeby -d postgres -c "DROP DATABASE comeby_e2e"
```

`NEXT_PUBLIC_APP_URL` must be set before `pnpm run build`, because it is baked into the browser code.

### Rate limits in tests

The app limits sign-ups to 3 per network per day and responses to 5 per device per hour, and those counters live in the database, so they survive between runs.

- The `test` fixture in `tests/e2e/support.ts` gives every test its own fake client address through an `x-forwarded-for` header. Import `test` from there, not from `@playwright/test`, in every new spec.
- If counters still get in the way while developing, clear them: `docker compose exec postgres psql -U comeby -c "delete from rate_limits"`.

## Testing things a browser can't reach

Scheduled jobs (reminders, the daily digest, the data purge) have no button. They are covered by unit tests on the handler and integration tests on the queries. To watch one run for real, start the server against a throwaway database and send the job by hand with pg-boss:

```ts
import { PgBoss } from "pg-boss";
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: "pgboss" });
await boss.start();
await boss.send("guests.reminders-due", {});
await boss.stop();
```

The running server's worker picks it up, and the emails appear in Mailpit.

## What isn't tested yet

No end-to-end test covers: the calendar file and calendar links, the QR code, the CSV export, custom questions, +1s, the guest-list visibility modes, the RSVP deadline, cover image upload, Google sign-in, Turnstile with real keys, or push notifications. The accessibility spec does not yet cover the host's event dashboard, the edit form, or invites in themes other than the default.

## What CI runs

`.github/workflows/ci.yml`, on every pull request and push to `main`:

1. **check**: install, lint, `pnpm audit` (high severity, production dependencies), a migration drift check (`drizzle-kit check`, then `generate`, and fail if anything changed), typecheck, theme contrast, unit tests with coverage, build.
2. **integration**: the integration suite against a PostgreSQL 18 service.
3. **e2e**: PostgreSQL and Mailpit services, a production build, `pnpm start`, then the Playwright suite including the admin tests. `test-results` is uploaded when it fails.
4. **docker**: builds the image to prove the Dockerfile still works. Nothing is pushed.
