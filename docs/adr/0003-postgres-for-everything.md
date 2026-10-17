# 0003: PostgreSQL for data, jobs and rate limits (no Redis)

**Status:** accepted · 2026-10-17

## Context
Comeby must be cheap to run and simple to operate for one person.

## Decision
Use one PostgreSQL database for application data, background jobs (pg-boss, schema `pgboss`) and fixed-window counters (`rate_limits` table). Workers run inside the web process, started from `instrumentation.ts`.

## Consequences
- One service to back up and monitor.
- Good for a single server and our expected load. If we ever run several app instances, workers can move to a separate process with no code changes, and Better Auth's in-memory rate limiter should switch to database storage.
