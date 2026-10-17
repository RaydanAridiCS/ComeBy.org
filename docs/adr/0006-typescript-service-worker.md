# 0006: Service worker written in TypeScript

**Status:** accepted · 2026-10-17

## Context
The project is TypeScript-only, but browsers need a plain `sw.js` for push notifications.

## Decision
Write the worker in `src/sw/service-worker.ts` (own `tsconfig.json` with the `webworker` lib) and bundle it to `public/sw.js` with esbuild (`npm run build:sw`, run automatically before `dev` and `build`). `public/sw.js` is gitignored.

## Consequences
The worker is type-checked like the rest of the code; there's one extra build step.
