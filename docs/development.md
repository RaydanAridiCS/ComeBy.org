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
- **Forms** (React Hook Form + the shared Zod schema) follow three rules, each with a helper in `src/components/forms/`:
  - Every control is tied to its error and hint: spread `fieldA11y(id, { invalid, hint }).control` on the input and give the error and hint elements the ids it returns. That sets `aria-invalid` (which is also what draws the red border) and `aria-describedby`. Errors are shown with `role="alert"` so they are announced.
  - A failed submit moves focus to the first invalid field: pass `useFocusFirstInvalid(formRef)` as the second argument of `handleSubmit`, and call it after applying server errors. It opens a collapsed `<details>` section around the field first. Set `shouldFocusError: false` on the form so React Hook Form doesn't also try.
  - A form that can lose work calls `useUnsavedChanges(dirty)` (`src/components/navigation/navigation-guard.tsx`) and calls the function it returns once the save has succeeded. Links that can leave such a form must be `GuardedLink`s: the dashboard header, the user menu and the edit page's back link already are. The browser's Back button cannot be intercepted; the page is kept alive instead (see [architecture.md](architecture.md#caching-and-rendering-cache-components)), so the draft is still there on return.
- **After-submit screens** on the sign-in pages ("Check your email", "Password changed", "This link doesn't work") use `AuthStatus` (`src/features/auth/components/auth-status.tsx`). It brings its own heading and takes focus, and `AuthCard` hides the page's heading and subtitle while one is showing, so a page never has two headings. Every such screen ends with a next step. Notices use `Alert`: `default` for news (soft blue, `role="status"`), `destructive` for problems (soft red, `role="alert"`).
- **Confirm steps** for anything that can't be taken back use `ConfirmDialog` (`src/components/confirm-dialog.tsx`), not `AlertDialog` directly. It is a bottom sheet on phones (confirm button last, full width, above the home bar and an on-screen keyboard) and a centred dialog from `sm` up. `onConfirm` returns `{ ok: true }` to close or `{ ok: false, message }` to stay open with the message inside; `outcomeOf(result)` converts a server action's result. While it runs, the dialog can't be closed and the confirm button spins. A request that never comes back shows `common.networkError`. Pass `returnFocusTo` when the dialog is opened from a menu or its trigger can disappear. Removing a response is optimistic: the row and counts change in the React Query cache first and are put back if the action fails.
- **Toasts** in the dashboard sit below its sticky header (`<Toaster belowHeader />`).
- **First run.** A confirmation link (from sign-up, from "Send again", or a Google sign-up) goes to the page that was asked for with `?next=`, or else to `FIRST_RUN_PATH` (`/dashboard/start`), which sends a host with no events into the new-event form. Use `firstRunNext()` from `src/features/auth/safe-next.ts` for any new place that sends one. Signing in keeps going to `next` or `/dashboard`.
- **Phones first** (most people use Comeby on one). `tests/e2e/ergonomics.spec.ts` checks the first three rules on the main screens:
  - Anything a thumb must hit is at least 44 × 44 px below `sm`. The `Button` sizes, selects, menu rows, tabs, checkboxes, radios and switches already are; desktop sizes stay compact from `sm` up. For a control that should stay small to the eye (a chip in a dense row, a text link under a heading), add `relative hit-area` (`src/app/globals.css`): it draws an invisible 44 px target on `::before`, so don't combine it with `before:` styles, and leave room so neighbouring targets don't overlap.
  - Every page's `<main>` has `id="main"` and `tabIndex={-1}`: the root layout's "Skip to content" link, the first thing a keyboard reaches, moves focus there. A new page that renders its own `<main>` needs both.
  - Plain links and `<summary>` get a focus ring from `globals.css` (brand blue, or the theme's accent on invites). Something that sets `outline-none` must draw its own `focus-visible` ring.
  - The page reaches under a phone's notch and home bar (`viewport-fit=cover`). Anything that touches a screen edge pads for it with `--safe-top`, `--safe-bottom`, `--safe-left` and `--safe-right`: the sticky headers, the event form's action bar, sheets (in the primitive), toasts (in `sonner.tsx`) and the last row of a page already do.
  - A `<Suspense>` boundary around a form gets a skeleton of the same shape (see `auth-form-skeleton.tsx`), never an empty card.
- **A new repository method** goes in three places: `src/server/repositories/interfaces.ts`, the Drizzle repository, and the in-memory fake in `tests/unit/support/fakes.ts`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…). This is a convention: there are no git hooks and CI does not check it.
- New libraries or big design changes get a short ADR in `docs/adr/`.
