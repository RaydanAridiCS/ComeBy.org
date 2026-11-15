# 0012: Better Auth with database sessions and no cookie cache

**Status:** accepted · recorded 2026-11-15 (the decision was made earlier, during the build)

## Context
Hosts need accounts; guests never do. We want email and password with verified addresses, optional Google sign-in, and no outside identity service to pay for or depend on. Sessions must be revocable, because settings lets a host sign out other devices.

## Decision
Use Better Auth (`src/server/auth/auth.ts`) with the Drizzle adapter, storing users, sessions, accounts and verification tokens in our own PostgreSQL.

- Email verification is required before an account can be used.
- Google sign-in is enabled only when its two variables are set, and is linked to an existing account with the same address.
- Sessions last 30 days. The signed-cookie session cache is left **off**, so every request looks the session up in the database.
- Changing email takes two steps: the current address approves, then the new one is verified.
- Better Auth's rate limiter is on, with stricter per-minute rules for sign-in, sign-up, password reset and email changes. A separate hook limits new accounts to 3 per network per day using our own `rate_limits` table.
- The captcha plugin puts Cloudflare Turnstile on sign-up and password reset when Turnstile is configured.

## Consequences
- Signing a device out or changing the password takes effect on the very next request. The price is one indexed lookup per authenticated request, which is cheap at our size.
- No vendor, no per-user cost, and account data stays in our database.
- Better Auth owns the shape of four tables (`src/db/schema/auth.ts`); upgrading it can require a migration.
- Its rate limiter keeps counters in memory: they reset on restart and are per process. This is one of the reasons the app runs as a single instance ([ADR 0003](0003-postgres-for-everything.md)).
- There is no two-factor authentication. Better Auth has a plugin for it if that is ever wanted.
