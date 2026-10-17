<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Comeby project conventions

- Read `docs/architecture.md` first. Layers: routes/components → server actions (`features/*/actions.ts`) → services (`src/server/services`) → repositories (`src/server/repositories`). Only repositories import Drizzle.
- TypeScript only, strict; no `any`. Lint/format with Biome (`npm run lint:fix`).
- Every user-facing string goes through next-intl (`src/i18n/messages/en.json`). Zod messages are translation keys.
- Free-tier limits live in `src/config/limits.ts` and are enforced in services.
- Cache Components is on: request-time reads (cookies, session, fresh counts, `new Date()`) belong inside `<Suspense>`; call `connection()` before reading the clock.
- After host mutations, call `updateTag(eventCacheTag(id))` and `refresh()`.
- Run `npm run check` before finishing; e2e tests need the app + `docker compose up -d`.
