# Security model

How Comeby protects hosts, guests and their data, and where the protection stops. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

## What we are protecting

1. **Guests' contact details**: phone numbers, emails and messages. Only the event's host may ever see them.
2. **Host accounts**: nobody else may read or change a host's events.
3. **Guests' own responses**: only the guest who made a response may change or delete it, without them having an account.
4. **The service staying free**: one person or bot must not be able to run up email, storage or compute costs.

## Who can do what

| Actor | Proves who they are with | Can |
|---|---|---|
| Visitor with an invite link | The link itself | See the invite, respond, report it. See other guests only as far as the host allows |
| Guest who responded | An edit credential (cookie or emailed link) | Change, download or delete their own response |
| Host | A session | Everything on their own events and account |
| Operator | A session, plus a verified email listed in `ADMIN_EMAILS` | Review, restore or delete reported events |

There are no roles in the database and no API keys.

## Host accounts and sessions

Handled by Better Auth (`src/server/auth/auth.ts`, [ADR 0012](adr/0012-better-auth.md)).

- Email and password, 8 to 128 characters, stored only as a hash. The email must be verified before the account can be used. Optional Google sign-in, linked to an existing account with the same address.
- Sessions last 30 days and are stored in the database. There is **no signed-cookie cache**, so every request looks the session up. Signing a device out or changing the password takes effect on the very next request.
- Changing email takes two steps: the current address approves, then the new address is verified. A stolen session alone cannot move the account.
- Cookies are `Secure` whenever the app URL is `https://`.
- Sign-up and password-reset requests pass through Cloudflare Turnstile when it is configured.

## Authorisation

Every server action and every route handler checks the session and then checks ownership in the service layer. Nothing relies on the UI hiding a button.

- Services compare `event.hostId` with the signed-in user and throw `forbidden` otherwise (for example `rsvpService.dashboardData`, used by the dashboard, the live route and the CSV export).
- Ids in URLs are validated as UUIDs before any query.
- `/admin` calls `requireAdmin()` in the page and in each action. Anyone else gets the ordinary not-found page, so the route looks as if it doesn't exist ([ADR 0010](adr/0010-operators-by-email-allowlist.md)).

## Guest credentials

Guests never sign up ([ADR 0004](adr/0004-guests-without-accounts.md)).

- On a first response the server makes a random 24-byte secret, stores only its SHA-256 hash on the response, and sets an `httpOnly`, `SameSite=Lax` cookie holding `<responseId>.<secret>` for that event.
- If the guest left an email, the confirmation contains `/r/<responseId>.<secret>`. Opening it checks the secret and sets the same cookie on that device.
- Checks compare hashes in constant time.
- Treat `/r/...` links as passwords. They are never logged, error reports carry the route pattern rather than the real path, and the browser error endpoint scrubs token-like strings from the route it is sent.
- After the 90-day purge the stored hash is overwritten, so old links stop working.
- A link that doesn't check out always lands on the same page (`/r/invalid`), whether it is malformed, names an unknown response or carries the wrong secret. It never opens the invite, so a response id alone can't be used to find out which event it belongs to.

Events themselves are protected only by their link being unguessable-ish and unlisted: invites are `noindex`, excluded from the sitemap, and there is no way to browse or search them. Anyone who has the link can see the invite. Hosts choose their own link, so a short, guessable one is their choice.

## Personal data in transit and at rest

- Guest phone numbers, emails and messages are returned only by host-only code paths. The public guest list returns names at most, and only when the host turned that on.
- IP addresses are stored only as an HMAC keyed with `BETTER_AUTH_SECRET` (the one exception is Better Auth's own session table).
- Logs redact `email`, `phone`, `password` and `token` fields.
- Error reports contain the error type, a message with emails, phone numbers and long tokens removed, and the route pattern. No bodies, headers, cookies or query strings ([ADR 0008](adr/0008-error-reporting-without-sdk.md)).
- Sent email jobs are deleted after 24 hours.
- The database is not encrypted by the application. Disk encryption and backup protection are operational concerns ([operations.md](operations.md#backups)).

## Client IP and rate limits

Rate limits are fixed-window counters in the `rate_limits` table ([ADR 0015](adr/0015-rate-limits-and-client-ip.md)). The key is a hash, so the table holds no addresses.

| Limit | Value | Keyed by |
|---|---|---|
| New accounts | 3 a day | Network |
| Responses to one event | 5 an hour | Device cookie + network |
| Event creations | 5 an hour, 20 a month, 10 upcoming at once | Host |
| Reports | 10 a day, and one per event | Network |
| Guest download or delete requests | 10 an hour | Response |
| Account downloads | 5 a day | Host |
| Browser error reports | 20 an hour | Network |
| Auth endpoints | Per-minute limits from Better Auth (for example 10 sign-in attempts) | Network, in memory |

**The client address is taken from the `cf-connecting-ip` header first, then the first entry of `x-forwarded-for`, then `x-real-ip`** (`src/server/security/request-info.ts`). These headers are trusted as they arrive. That is correct only when every request passes through Cloudflare, which overwrites `cf-connecting-ip`. If the server can be reached directly, a client can set the header to anything and get a fresh allowance on every request. The server must therefore accept web traffic only from Cloudflare ([deployment.md](deployment.md#3-cloudflare-settings)).

Better Auth's limiter keeps counters in memory, so they reset when the app restarts and would not be shared between instances.

## Bots and abuse

- Cloudflare Turnstile on sign-up, password reset and every RSVP submission, when keys are set. For RSVPs, if Cloudflare cannot be reached the submission is rejected rather than allowed (`src/server/security/turnstile.ts`).
- Hard limits on everything that costs money: responses per event (200), update emails per event (5), one nudge per event to at most 100 pasted addresses, cover image size (5 MB).
- Every invite has a report button. Three reports from different networks hide the event and email the operators.
- The suppression list stops email to addresses that bounced, complained or unsubscribed.

## Browser protections

Set for every response in `next.config.ts`:

- **Content-Security-Policy** (`src/config/csp.ts`). Scripts and connections are limited to the app itself, Cloudflare Turnstile and the configured Umami host; images to the app and the uploads bucket. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. Scripts and styles allow `'unsafe-inline'`, because nonces would force every page to render dynamically ([ADR 0009](adr/0009-csp-without-nonces.md)).
- `Strict-Transport-Security` (two years, including subdomains, preload).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that turns off camera, microphone and geolocation.

`tests/e2e/security.spec.ts` checks the headers, and `tests/unit/csp.test.ts` checks the policy builder.

## Input handling

- All input is validated with Zod in the server action or route handler before it reaches a service.
- Database access goes through Drizzle with bound parameters.
- React escapes output. There is no `dangerouslySetInnerHTML` anywhere in `src`.
- **Uploads**: cover images must be JPEG, PNG or WebP, at most 5 MB and 40 megapixels. sharp re-encodes them to WebP within 1600 × 1600 px, which strips metadata (including GPS location) and rejects anything that isn't a real image. Storage keys must match a strict pattern (`covers/<id>.webp`), which rules out path traversal.
- **CSV export**: cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with an apostrophe so spreadsheets don't run them as formulas.
- **Redirects** after sign-in only go to paths inside the app (`src/features/auth/safe-next.ts`).

## Webhooks and signed links

- Resend webhooks are verified with their Svix signature and a 5-minute timestamp tolerance. The generic webhook requires a bearer secret, compared in constant time. An unconfigured webhook answers 404.
- Unsubscribe links are HMAC-signed with `BETTER_AUTH_SECRET`, so a link can only be made by the server, for the address it emailed.

## Secrets

- `BETTER_AUTH_SECRET` signs sessions, unsubscribe links and network hashes. It must be at least 32 characters, and the app refuses to start without it. What rotating it breaks is in [configuration.md](configuration.md#rotating-the-secret).
- Server-only variables cannot reach browser code: `src/env.ts` separates them, and server modules import `server-only`.
- `.env*` files are git-ignored except `.env.example`.

## Dependencies

CI runs `pnpm audit --prod --audit-level=high` on every push and fails on a high-severity advisory in a production dependency.

## Known limits

Stated plainly so nobody assumes more than is there:

- The Content-Security-Policy allows inline scripts and styles.
- An unauthorised visit to `/admin` shows the not-found page with HTTP status 200, because the check runs inside a streamed page. The page is `noindex` and disallowed in `robots.txt`.
- Client addresses are only trustworthy behind Cloudflare.
- Auth rate limits are per process and in memory.
- There is no account suspension: operators can remove events, not hosts.
- There is no two-factor authentication.
- Turnstile with real keys, the Resend webhook against real Resend, and the server-side error hook have each been tested with stand-ins, not against the live services.
