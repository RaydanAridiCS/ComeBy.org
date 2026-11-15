# 0013: Email behind an adapter, with categories and a suppression list

**Status:** accepted · recorded 2026-11-15 (the decision was made earlier, during the build)

## Context
Email is the only way Comeby reaches people outside the app, and the only running cost that grows with every guest. Three things have to hold: we can change provider without touching features, we stop emailing addresses that bounce or complain (or the sending domain's reputation suffers), and people can opt out of what they didn't directly ask for.

## Decision
- **One small interface.** `EmailSender` has a single `send` method. `EMAIL_PROVIDER` picks `console`, `smtp` (nodemailer) or `resend`.
- **Render first, queue second.** `queueEmail` renders the React Email template to HTML and plain text, then queues an `email.send` job holding the result. The worker only delivers.
- **Every email has a category**: `transactional` (the person asked for it), `guest-update` or `host-alert`.
- **A suppression list** (`email_suppressions`) holds lower-cased addresses with a reason. `isSendAllowed` decides: an `unsubscribed` address still gets transactional email; a `bounced` or `complained` address gets nothing at all.
- **Unsubscribe links are stateless.** The token is the scope, the address and an HMAC signed with `BETTER_AUTH_SECRET`. Emails carry both a link to a confirmation page and RFC 8058 one-click headers.
- **Guests and hosts unsubscribe differently.** A guest is added to the list. A host has their alert setting switched off and can switch it back on.
- **Bounces arrive by webhook**: a Resend endpoint verified by signature, and a generic bearer-token endpoint for SMTP providers. Each is off until its secret is set.
- The list is kept after guest data is purged and after accounts are deleted.

## Consequences
- Changing provider is an environment change.
- A retry sends exactly what was first rendered, even if the event changed in between.
- Queued email jobs contain the recipient and the full message, so they are deleted after 24 hours instead of pg-boss's default.
- Nothing is stored per sent email, so there is no delivery log and no "which emails did this person get" view.
- Rotating `BETTER_AUTH_SECRET` breaks unsubscribe links in mail already sent.
- Keeping the list forever means holding email addresses indefinitely. That is deliberate: deleting an opt-out would lead to emailing the person again. It is stated on the privacy page.
- Without a configured webhook, bounces are never recorded.
