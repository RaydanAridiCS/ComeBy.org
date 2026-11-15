# 0003: PostgreSQL for data, jobs and rate limits (no Redis)

**Status:** accepted · 2026-10-17

## Context
Comeby must be cheap to run and simple to operate for one person.

## Decision
Use one PostgreSQL database for application data, background jobs (pg-boss, schema `pgboss`) and fixed-window counters (`rate_limits` table). Workers run inside the web process, started from `instrumentation.ts`.

## Consequences
- One service to back up and monitor.
- Good for a single server and our expected load.
- Running several app instances is not supported today. It would need two changes first: a worker-only entrypoint (workers start from `instrumentation.ts` inside the web process, and `JOBS_ENABLED=false` runs jobs inline in the request rather than handing them to another process), and database storage for Better Auth's rate limiter, which keeps its counters in memory.
