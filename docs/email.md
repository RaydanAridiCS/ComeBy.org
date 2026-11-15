# Email

Comeby sends email for three reasons: things a person asked for (confirm your address, your RSVP receipt), updates about an event a guest responded to, and alerts for hosts. It never sends marketing.

## How an email is sent

1. A service or server action builds a template from `src/emails/templates.tsx` and calls `queueEmail(jobs, to, email, options)` (`src/server/services/email.service.ts`).
2. `queueEmail` renders the template to HTML **and** plain text straight away, then queues an `email.send` job with the result.
3. The worker checks the suppression list. If the address may receive this category of email, it hands the message to the provider chosen by `EMAIL_PROVIDER`.
4. A failed send is retried up to three times with backoff. The finished job is deleted after 24 hours.

Because the email is rendered before it is queued, a retry sends exactly the same content.

## Providers

`EMAIL_PROVIDER` picks one (`src/server/adapters/email/index.ts`):

| Value | What it does | Use for |
|---|---|---|
| `console` (default) | Logs the subject and the first 500 characters of the text. Sends nothing | Quick local work |
| `smtp` | Any SMTP server, through nodemailer. Port 465 uses TLS from the start | Mailpit in development and tests; Amazon SES or similar in production |
| `resend` | The Resend API | Production |

Adding a provider means implementing `EmailSender` (one `send` method) and adding a case to `getEmailSender`. See [ADR 0013](adr/0013-email-adapter-and-suppression.md).

## Templates

All twelve live in `src/emails/templates.tsx` and share `src/emails/layout.tsx` (logo, accent bar, footer). Text comes from the `emails` namespace of the message catalogue.

| Template | Sent to | When | Category |
|---|---|---|---|
| `verifyEmail` | Host | Sign-up, and sign-in with an unverified address | transactional |
| `changeEmailConfirm` | Host (current address) | Asking to change email; the new address then gets a verification email | transactional |
| `resetPassword` | Host | Forgot password | transactional |
| `rsvpConfirmation` | Guest | Responding with an email, or changing the email on a response. Contains the private edit link | transactional |
| `rsvpDeleted` | Guest | Deleting their own response | transactional |
| `eventHiddenAlert` | Operators | An event was hidden after reports | transactional |
| `hostRsvpAlert` | Host | A guest responded or changed their answer | host-alert |
| `hostDigest` | Host | Daily summary | host-alert |
| `eventUpdated` | Guests | Time, place or details changed | guest-update |
| `eventCancelled` | Guests | Event cancelled | guest-update |
| `guestReminder` | Guests | In the 24 hours before the event | guest-update |
| `guestNudge` | "Maybe" guests and pasted addresses | The host's one-time nudge | guest-update |

## Categories, unsubscribes and the suppression list

Every email has a category (`EmailCategory` in `src/server/services/suppression.service.ts`). The category decides who can stop it:

| Category | Carries an unsubscribe link | Stopped by an unsubscribe | Stopped by a bounce or complaint |
|---|---|---|---|
| `transactional` | No | No | Yes |
| `guest-update` | Yes | Yes | Yes |
| `host-alert` | Yes | Yes (see below) | Yes |

What an unsubscribe does depends on who clicks it:

- **A guest** is added to the `email_suppressions` table with reason `unsubscribed`. They still get emails they ask for directly, such as an RSVP receipt.
- **A host** is not added to the list. Their email alerts are switched to "off" in settings, and they can switch them back on.

Hard bounces and spam complaints add the address with reason `bounced` or `complained`. Those addresses never receive any email again, not even a password reset.

The list is keyed by lower-cased address and is kept after guest data is purged. Otherwise an opt-out would be forgotten.

### Unsubscribe links

Guest-update and host-alert emails carry two things:

- A link in the body to `/unsubscribe?t=<token>`, which shows a confirmation page.
- `List-Unsubscribe` and `List-Unsubscribe-Post` headers pointing at `/api/unsubscribe?t=<token>`, so mail apps can show their own "Unsubscribe" button (one-click, RFC 8058). A `POST` there unsubscribes immediately; a `GET` redirects to the confirmation page.

The token is `<scope>.<base64url email>.<HMAC>`, signed with `BETTER_AUTH_SECRET` (`src/server/security/unsubscribe-token.ts`). It is stateless, so nothing is stored when an email is sent, and nobody can unsubscribe an address they didn't receive mail for. Rotating the secret invalidates links in emails already sent.

### Bounce and complaint webhooks

`POST /api/email/webhook/<provider>` (`src/app/api/email/webhook/[provider]/route.ts`):

| Provider | Turned on by | Authentication | Acts on |
|---|---|---|---|
| `resend` | `RESEND_WEBHOOK_SECRET` | Svix signature headers, 5-minute tolerance | `email.complained`, and `email.bounced` unless the bounce type is `transient` |
| `generic` | `EMAIL_WEBHOOK_SECRET` | `Authorization: Bearer <secret>` | `{ "type": "bounced" \| "complained", "email": "..." }` |

A provider whose secret isn't set answers 404, as if the route didn't exist. Events the app doesn't act on (delivered, opened, transient bounces) are acknowledged with 200. Bodies over 100 KB are refused.

To set up Resend: create a webhook pointing at `https://comeby.org/api/email/webhook/resend`, subscribe it to `email.bounced` and `email.complained`, and put its signing secret in `RESEND_WEBHOOK_SECRET`.

Without a webhook, bounces are never recorded and the app keeps emailing dead addresses, which hurts sender reputation.

## Limits that involve email

From `src/config/limits.ts`:

- 5 update emails ("changed" or "cancelled") per event.
- 1 nudge per event, to "maybe" guests plus up to 100 pasted addresses.
- 1 reminder per guest, not sent to anyone who responded in the last 2 hours.
- 50 instant alert emails per host per day; after that the daily digest covers the rest.

## Working on emails locally

- With `EMAIL_PROVIDER=smtp` and `docker compose up -d`, every email lands in Mailpit at http://localhost:8025. This is how the end-to-end tests read confirmation links.
- `pnpm exec tsx scripts/send-test-email.ts you@example.com` sends one plain test email through Resend, to check an API key and sender domain. It only tests Resend, and it reads `.env.local` then `.env`.
- Unit tests for unsubscribe links, headers and categories are in `tests/unit/email-compliance.test.tsx`.

## Things emails don't do yet

- They use Comeby's own colours, not the event's theme.
- The RSVP confirmation has no calendar attachment.
- There is no welcome email for new hosts.
- The language is fixed to English (`lang="en"`), like the rest of the app.
