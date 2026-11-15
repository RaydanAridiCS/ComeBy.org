# Tech stack

Every choice below serves the [product principles](business-plan.md#5-product-principles): fast on cheap phones, cheap enough to run for free, and easy for one person to maintain.

## Core

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, Cache Components) | Server-rendered invite pages load fast inside WhatsApp; built-in preview-image generation; server actions for forms. We avoid Vercel-only features so it runs anywhere in Docker. |
| Language | **TypeScript**, strict | `strict` + `noUncheckedIndexedAccess`; `any` is a lint error. No `.js` source files (the service worker is TypeScript compiled by esbuild). |
| Database | **PostgreSQL 18** | One database for everything, including background jobs. `uuidv7()` IDs are time-ordered. |
| ORM | **Drizzle ORM** | Light, fully typed, close to SQL. Used only inside repositories. |
| Validation | **Zod 4** | One schema validates forms in the browser, server action input and environment variables. |
| Environment | **@t3-oss/env-nextjs** | Validates every variable at startup with Zod (`src/env.ts`) and keeps server-only values out of browser code. |
| Auth | **Better Auth** | Email/password with verified emails, optional Google sign-in. Sessions stored in our Postgres. No vendor. |
| Background jobs | **pg-boss** | Job queue inside Postgres: emails, alerts, daily summaries, data clean-up. No Redis. |

## UI

| Concern | Choice | Why |
|---|---|---|
| Components | **shadcn/ui** (Radix base) | Accessible components we own and can restyle. |
| Styling | **Tailwind CSS 4** | Required by shadcn; invite themes are CSS variables on top. |
| Animation | **Motion** (`motion/react`, `LazyMotion`) | The confetti burst on "You're in!". Loaded lazily and skipped for reduced-motion users. |
| Client state | **Zustand** | UI-only state such as response filters (sort order persisted). Never a copy of server data. |
| Server state | **TanStack Query** | Auto-refreshes the host dashboard every 15 seconds. |
| Forms | **React Hook Form** + Zod resolver | Fast forms with shared validation. |
| Translations | **next-intl** | English only for now, but every string goes through it. |
| Toasts | **Sonner** | Success and error messages after host actions. |
| Icons | **lucide-react** | |

## Features

| Concern | Choice | Cost |
|---|---|---|
| Email | **React Email** templates; provider chosen by `EMAIL_PROVIDER`: SMTP through **nodemailer** (Mailpit in dev, Amazon SES later), **Resend**, or console. See [email.md](email.md) | Resend free tier: 3,000/month |
| File storage | Local disk (dev) or any **S3-compatible** bucket; **Cloudflare R2** in production | R2: 10 GB free, no bandwidth fees |
| Images | **sharp** resizes covers to ≤1600 px WebP and strips metadata | Free |
| Push | **Web Push** (`web-push`, VAPID) + a TypeScript service worker | Free, no Firebase |
| Bot protection | **Cloudflare Turnstile** (optional) | Free |
| Dates | **@date-fns/tz** for zone conversion + `Intl` for display | |
| Phone numbers | **libphonenumber-js** / react-phone-number-input | |
| Calendar | **ics** + Google/Outlook links | |
| QR codes | **qrcode** (generated on our server) | |
| Maps | Plain map links, no maps API | Free |
| Logging | **pino** (JSON logs, personal data redacted) | |

## Tooling

| Concern | Choice |
|---|---|
| Package manager | **pnpm**, version pinned in `package.json` and installed through corepack ([ADR 0017](adr/0017-pnpm-no-git-hooks.md)) |
| Lint + format | **Biome** |
| Migrations | **drizzle-kit** generates SQL from the schema; the app applies it on start |
| Unit tests | **Vitest** (services run against in-memory repositories) |
| Integration tests | **Vitest** against a real, throwaway PostgreSQL database |
| End-to-end tests | **Playwright** (desktop + mobile), including **axe** accessibility checks (`@axe-core/playwright`) |
| Service worker build | **esbuild** compiles `src/sw/service-worker.ts` to `public/sw.js` |
| CI | **GitHub Actions**: lint, dependency audit, migration drift check, typecheck, theme contrast, unit tests with coverage, build, integration tests, e2e with Postgres + Mailpit, Docker build |
| Local services | **docker compose**: PostgreSQL 18 + Mailpit |

How the test suites fit together is in [testing.md](testing.md).

## Hosting

| Concern | Choice | Cost |
|---|---|---|
| Server | A VPS (for example Hetzner) running **Coolify**, deploying the Dockerfile | ~$5–10/month |
| DNS, CDN, DDoS | **Cloudflare** | Free |
| Backups | Coolify scheduled Postgres backups to an R2 bucket, set up by hand ([operations.md](operations.md#backups)) | ~Free |
| Errors | Server, job and browser errors go to any Sentry-compatible server such as self-hosted **GlitchTip**, over plain HTTP with no SDK ([ADR 0008](adr/0008-error-reporting-without-sdk.md)) | Free |
| Analytics | Self-hosted **Umami** (optional, cookie-less) | Free |
| Monitoring | **Beszel** + an uptime check on `/api/health` | Free |
