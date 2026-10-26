# 0008: Error reporting to a Sentry-compatible server, without an SDK

**Status:** accepted · 2026-10-26

## Context
Production errors (server, browser, background jobs) were only written to the server log. Comeby is open source and self-hosted, so the reporting target must be something operators can run themselves (GlitchTip) or rent (Sentry). The Sentry SDK is large, wraps the Next.js config, and would need review for every Next.js release, while Comeby also has strict rules about what may leave the server (no guest emails or phone numbers, no invite links, which are credentials).

## Decision
`src/server/monitoring/error-reporting.ts` posts one JSON event to the project's `store` endpoint using the DSN in `ERROR_REPORTING_DSN`. It sends only the error type, a scrubbed message, the stack and the **route pattern** (`/[slug]`, never the real path). Emails, phone numbers and token-like strings are removed from text. Browser errors go through our own `/api/client-error` route (rate-limited and size-capped), so the DSN stays server-side and the Content-Security-Policy needs no new origin.

## Consequences
- Works with Sentry and GlitchTip, off by default, no dependency.
- No breadcrumbs, release tracking, source maps or performance data. If those are needed later, adopt the SDK and keep the scrubbing rules.
- Reports are capped at 30 per minute per process, so an error loop can't flood the reporting server.
