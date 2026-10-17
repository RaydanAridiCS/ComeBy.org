# 0001: Next.js 16 with Cache Components

**Status:** accepted · 2026-10-17

## Context
Invites are opened inside WhatsApp on phones, often on slow data. The first paint must be instant, link previews must work, and we self-host in Docker.

## Decision
Use Next.js 16 App Router with `cacheComponents` and `partialPrefetching` (the defaults for new apps, and the model Next.js will make universal). Request-time data lives inside `<Suspense>`. The public event is cached with `"use cache"` and invalidated with `updateTag` on every host change.

## Consequences
- Every page gets a static shell; live parts stream in.
- Developers must keep cookie, session and fresh reads inside Suspense. The dev overlay enforces this.
- Pages that stream after the shell (for example a missing invite) return HTTP 200 with the not-found UI. That's acceptable because invites are `noindex`.
- We avoid Vercel-only features; output is `standalone` for Docker.
