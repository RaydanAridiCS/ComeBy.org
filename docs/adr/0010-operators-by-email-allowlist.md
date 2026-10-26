# 0010: Operators identified by an email allowlist

**Status:** accepted · 2026-10-26

## Context
Events that are reported three times are hidden automatically, and someone has to review them. The moderation page needs a way to know who is an operator.

## Decision
`ADMIN_EMAILS` (comma-separated) lists operator addresses. A signed-in user is an admin only when their address is on the list **and** verified (`src/server/auth/admin-policy.ts`). Everyone else, signed in or not, gets the normal 404 page for `/admin`. Every admin action is written to `admin_audit_log` with a copy of the event title and link, so the record survives deleting the event.

## Consequences
- No role column, no migration, no "first user becomes admin" trap. Changing operators means changing an environment variable and restarting.
- There is no per-admin permission model. Add a `role` column if different operator powers are ever needed.
- Suspending a host's account is not part of this change: the actions are restore and delete.
- Because the guard runs inside a streamed page, an unauthorised visit to `/admin` shows the 404 page with HTTP 200 rather than a 404 status. The page is `noindex` and disallowed in `robots.txt`.
