# 0002: Repository pattern with injected service dependencies

**Status:** accepted · 2026-10-17

## Context
Business rules (hard limits, ownership, notable changes) must be easy to test and hard to bypass, and the project should stay approachable for contributors.

## Decision
- **Repositories** (`src/server/repositories`) are the only code that touches Drizzle. Each one is a small interface plus a Drizzle implementation. There is no generic base class.
- **Services** are factory functions taking `{ repos, transaction, jobs, now }`.
- **Server actions** stay thin: auth, validation, service call, cache refresh.

## Consequences
- Unit tests run services against in-memory fakes, with no database needed.
- A little more boilerplate per query, which is worth it for clarity.
