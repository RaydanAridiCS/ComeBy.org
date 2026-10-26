# Development

## Setup

```bash
npm install                 # also installs git hooks (Lefthook)
cp .env.example .env.local  # set BETTER_AUTH_SECRET; optionally VAPID keys
docker compose up -d        # PostgreSQL 18 on :5432, Mailpit on :1025 / :8025
npm run db:migrate
npm run dev                 # http://localhost:3000
```

With `EMAIL_PROVIDER=smtp`, every email the app sends in development lands in **Mailpit**: http://localhost:8025. Sign up, open Mailpit, and click the confirmation link.

To send real emails with **Resend** instead, set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` (in `.env.local`, which wins over `.env`), then check the setup with `npx tsx scripts/send-test-email.ts you@example.com`. Until your domain is verified in Resend, use `EMAIL_FROM="Comeby <onboarding@resend.dev>"`, which can only send to your own Resend account email. The end-to-end tests read emails from Mailpit, so switch back to `smtp` before running them.

Migrations also run automatically whenever the server starts.

## Everyday commands

| Task | Command |
|---|---|
| Lint + format check | `npm run lint` (`npm run lint:fix` to fix) |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` / `npm run test:watch` (`npm run test:coverage` for a coverage report) |
| Integration tests (real Postgres) | `docker compose up -d`, then `npm run test:integration`. Creates and drops a throwaway database. |
| End-to-end tests | `docker compose up -d`, then `npm run test:e2e`. Starts `npm run dev` if the app isn't running; for a production-like run use `npm run build && npm start` first. Set `E2E_ADMIN_EMAIL` (and start the app with `ADMIN_EMAILS` set to the same address) to include the admin tests. |
| Theme contrast (WCAG) | `npm run check:contrast` (part of `npm run check`) |
| Change the database | edit `src/db/schema/*`, then `npm run db:generate` and commit the new SQL and snapshot files in `drizzle/`. Never edit a migration that is already committed; add a new one |
| Browse the database | `npm run db:studio` |
| Regenerate app icons | `npx tsx scripts/generate-icons.ts` |

## Conventions

- **TypeScript only**, strict. No `any` (lint error).
- **Every visible string goes through next-intl** (`src/i18n/messages/en.json`), including validation messages, which are translation keys.
- **Business rules live in services**, never in components or actions. Database queries live in repositories.
- **Server actions** always: `requireUser()` (if needed) → Zod `parse` → service → `updateTag`/`refresh` → return via `runAction`.
- **Request-time data goes inside `<Suspense>`** (Cache Components). The dev overlay tells you when you forget.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…), enforced by commitlint.
- New libraries or big design changes get a short ADR in `docs/adr/`.

## Testing

- **Unit tests** (`tests/unit`) run services against in-memory repositories (`support/fakes.ts`), so limits and rules are tested without a database.
- **End-to-end tests** (`tests/e2e`) drive a real browser through sign-up (reading the confirmation email from Mailpit), creating an event, a guest responding, and the host seeing it. They need the app, Postgres and Mailpit running.
- The sign-up limit (3 accounts per network per day) also applies to tests. If you run e2e many times in a day, clear it: `docker compose exec postgres psql -U comeby -c "delete from rate_limits"`.
