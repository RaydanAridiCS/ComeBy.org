# Development

## Setup

Requirements: Node.js 24 or newer, Docker, and pnpm. The pnpm version is pinned in `package.json` (`packageManager`), so the simplest way to get the right one is `corepack enable`.

```bash
corepack enable             # once per machine; makes `pnpm` use the pinned version
pnpm install
cp .env.example .env.local  # set BETTER_AUTH_SECRET; optionally VAPID keys
docker compose up -d        # PostgreSQL 18 on :5432, Mailpit on :1025 / :8025
pnpm run db:migrate
pnpm run dev                 # http://localhost:3000
```

With `EMAIL_PROVIDER=smtp`, every email the app sends in development lands in **Mailpit**: http://localhost:8025. Sign up, open Mailpit, and click the confirmation link.

To send real emails with **Resend** instead, set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` (in `.env.local`, which wins over `.env`), then check the setup with `pnpm exec tsx scripts/send-test-email.ts you@example.com`. Until your domain is verified in Resend, use `EMAIL_FROM="Comeby <onboarding@resend.dev>"`, which can only send to your own Resend account email. The end-to-end tests read emails from Mailpit, so switch back to `smtp` before running them.

Migrations also run automatically whenever the server starts, so `pnpm run db:migrate` is optional. Note that it does not read `.env.local`: it uses `DATABASE_URL` from your shell and otherwise falls back to the docker compose database (`drizzle.config.ts`).

## Everyday commands

| Task | Command |
|---|---|
| Everything before a PR | `pnpm run check` (lint, typecheck, theme contrast, unit tests) |
| Lint + format check | `pnpm run lint` (`pnpm run lint:fix` to fix, `pnpm run format` to format only) |
| Typecheck | `pnpm run typecheck` (app and service worker) |
| Unit tests | `pnpm test` / `pnpm run test:watch` (`pnpm run test:coverage` for a coverage report) |
| Integration tests (real Postgres) | `docker compose up -d`, then `pnpm run test:integration` |
| End-to-end tests | `docker compose up -d`, then `pnpm run test:e2e` |
| Theme contrast (WCAG) | `pnpm run check:contrast` |
| Production build / server | `pnpm run build` / `pnpm start` |
| Rebuild the service worker only | `pnpm run build:sw` (`dev` and `build` already do this) |
| Change the database | edit `src/db/schema/*`, then `pnpm run db:generate` and commit the new SQL and snapshot files in `drizzle/`. Never edit a migration that is already committed; add a new one |
| Browse the database | `pnpm run db:studio` |
| Regenerate app icons | `pnpm exec tsx scripts/generate-icons.ts` |

How the test suites work, what they need and how to run them safely is in [testing.md](testing.md).

## Conventions

- **TypeScript only**, strict. No `any` (lint error).
- **Every visible string goes through next-intl** (`src/i18n/messages/en.json`), including validation messages, which are translation keys. See [i18n.md](i18n.md) for the wording rules.
- **Business rules live in services**, never in components or actions. Database queries live in repositories.
- **Server actions** always: `requireUser()` (if needed) → Zod `parse` → service → `updateTag`/`refresh` → return via `runAction`.
- **Request-time data goes inside `<Suspense>`** (Cache Components). The dev overlay tells you when you forget.
- **A new repository method** goes in three places: `src/server/repositories/interfaces.ts`, the Drizzle repository, and the in-memory fake in `tests/unit/support/fakes.ts`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…). This is a convention: there are no git hooks and CI does not check it.
- New libraries or big design changes get a short ADR in `docs/adr/`.
