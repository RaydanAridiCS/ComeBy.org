# 0015: Fixed-window rate limits in PostgreSQL, keyed by hashed network

**Status:** accepted · recorded 2026-11-15 (the decision was made earlier, during the build)

## Context
Comeby is free, so every limit is also a cost control: sign-ups per network, responses per device, events per hour, reports, data downloads. Guests have no accounts, so many limits can only be tied to a network or a device. We don't want Redis ([ADR 0003](0003-postgres-for-everything.md)), and we don't want to store IP addresses.

## Decision
- **Counters live in one table**, `rate_limits (key, count, expires_at)`. `hit(key, window)` is a single `INSERT … ON CONFLICT DO UPDATE … RETURNING count`. The window's start is part of the key, so each window is its own row. An hourly job deletes expired rows.
- **Fixed windows**, not sliding ones. A burst across a window boundary can reach twice the limit; that is acceptable for limits whose job is to stop abuse and runaway cost.
- **Services enforce limits** and throw `LimitReachedError` or `rate_limited`, so every caller gets the same rule.
- **Networks are never stored in the clear.** Keys use `hmac("net:" + ip)` with `BETTER_AUTH_SECRET`. The response limit also mixes in a random device cookie, so people sharing a network don't share an allowance.
- **The client address** is read from `cf-connecting-ip`, then the first `x-forwarded-for` entry, then `x-real-ip`, and trusted as it arrives.

## Consequences
- No extra service, and limits survive restarts.
- Every limited action costs one extra write. Fine at our size.
- **The address is only trustworthy behind Cloudflare.** Cloudflare overwrites `cf-connecting-ip`; a server reachable directly would accept whatever a client sends, and every per-network limit could be bypassed. The deployment must make the server unreachable except through Cloudflare. The code does not enforce this.
- A whole network behind one address (a campus, a mobile carrier) shares the per-network limits, most visibly 3 sign-ups a day.
- Rotating `BETTER_AUTH_SECRET` changes every network hash and so resets these counters.
- Better Auth's own limiter is separate and in memory ([ADR 0012](0012-better-auth.md)).
- End-to-end tests have to send a different `x-forwarded-for` per test, or they trip each other's limits.
