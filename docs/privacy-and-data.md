# Privacy and data

What Comeby stores about people, how long it keeps it, and how they get it back or deleted. This is the engineering view of the promises made on the public [privacy page](../src/i18n/messages/en.json) (`legal.privacySections`). **If the behaviour described here changes, the privacy page must change in the same pull request, and the other way round.**

Tables and columns are described in [data-model.md](data-model.md).

## What is stored

### About hosts

| Data | Where | Notes |
|---|---|---|
| Name, email, whether the email is verified | `user` | |
| Password | `account.password` | A hash made by Better Auth, never the password itself |
| Google account link, if used | `account` | Provider id and tokens issued by Google |
| Sessions | `session` | Token, expiry, IP address and user agent. Settings shows the browser and operating system so a host can recognise a device; the IP address is stored but not shown |
| Alert preferences | `user_settings` | |
| Push subscriptions | `push_subscriptions` | The browser's push endpoint and keys |
| Events they created | `events` and a cover image in file storage | |

### About guests

Guests have no account. A response holds:

| Data | Required? | Who can see it |
|---|---|---|
| Name | Always | The host. Other guests too, if the host chose to show names |
| Going / Maybe / Can't go, and number of +1s | Always | The host. Counts are public if the host shows the guest list |
| Phone number | If the host asks for it | The host only |
| Email | Optional | The host only |
| Message to the host | Optional | The host only |
| Answers to the host's questions | If the host asks | The host only |

Also stored per response: a SHA-256 hash of the secret that lets the guest edit it (never the secret), and when the reminder was sent.

### Other things that touch personal data

| Data | Where | Notes |
|---|---|---|
| Addresses a host pasted to be nudged | `event_invitees` | People who never used Comeby. Used for one email |
| Activity timeline | `event_activity` | Includes guest names, for example "Ahmad responded Going" |
| Do-not-email list | `email_suppressions` | Lower-cased address and the reason |
| Abuse reports | `reports` | The reason, optional free text, and a keyed hash of the reporter's network. No name or IP |
| Rate-limit counters | `rate_limits` | Keys built from keyed hashes of the network or device. No raw IP |
| Emails waiting to be sent, and recently sent | `pgboss` job tables | The full message and the recipient's address |
| Operator actions | `admin_audit_log` | The operator's email, and the title and link of the event |

Cookies: one session cookie for signed-in hosts, one cookie per invite holding the guest's edit credential, and one random device id used only for rate limiting. All are `httpOnly`. There are no advertising or tracking cookies.

IP addresses are never written to the application tables in the clear, with one exception: Better Auth records the IP address and user agent on each host session.

## How long it is kept

| Data | Kept until |
|---|---|
| Guest phone numbers and emails | 90 days after the event ends, then deleted automatically |
| Pasted invitee addresses | The same 90-day purge |
| Guest names, answers, messages, +1s | The host deletes the response, the event or their account, or the guest deletes their own response |
| Events | The host deletes them or their account |
| Host account data | The host deletes the account |
| Sent email jobs | 24 hours |
| Rate-limit counters | Their window ends (an hour or a day); cleaned hourly |
| Do-not-email list | Indefinitely. This is deliberate: forgetting an opt-out would mean emailing the person again |
| Operator audit log | Indefinitely |
| Database backups | 30 days at most. This is an operations setting, not code: see [operations.md](operations.md#backups) |

### The 90-day purge

The job `privacy.purge-guest-data` runs every day at 03:30 UTC. For every event that ended more than 90 days ago (`LIMITS.guestDataRetentionDays`), or was cancelled and not touched for 90 days, and has not been purged yet, it:

1. sets `phone` and `email` to null on every response,
2. overwrites each response's edit-token hash with the word `purged`,
3. deletes the event's pasted invitee addresses,
4. stamps `events.guest_data_purged_at`.

Consequences worth knowing:

- Guests' edit links and cookies for that event stop working, so after the purge a guest can no longer change, download or delete their response themselves. The host still can delete it.
- Names, messages and answers are **not** purged. Only contact details are.
- An event with no end time is treated as ending 6 hours after it starts (`eventEndSql` in `src/server/repositories/drizzle/event.repository.ts`, and `isEventOver` in the event service).
- The nudge cannot be sent for a purged event.

## What guests can do themselves

On the invite page, from the device they responded on, or after opening the private link in their confirmation email:

- **Change** their response, while the event is still accepting responses.
- **Download** it: `GET /api/rsvp/export?event=<id>` returns a JSON file with the event title and time, and everything stored about their own response. Nothing about other guests.
- **Delete** it. This works even after the event ended, was cancelled or was hidden. Deleting removes the response row, and also strips the guest's name from the host's activity timeline; the entries stay, without a name. If they had left an email they get a short confirmation.

Download and delete together are limited to 10 requests per response per hour.

When a **host** removes a response, the guest's name stays in the timeline entry that records the removal.

## What hosts can do themselves

From settings:

- **Download everything**: `GET /api/account/export` builds a JSON file with their profile, settings, events, pasted invitee addresses and every response to their events. It is generated on request and never stored, because a stored file would be publicly reachable in the bucket ([ADR 0014](adr/0014-storage-adapter.md)). Limited to 5 a day. It does not include guests' edit secrets.
- **Delete the account**: removes the user, and by cascade their sessions, settings, push subscriptions, events, and each event's responses, invitees, activity and reports. Cover images are deleted from storage first.
- Change name, email and password, and sign out other devices.

From an event's dashboard: export responses as CSV, remove a response, delete the event.

## Who else processes data

- The **email provider** (Resend, or an SMTP provider) receives every outgoing email.
- **Cloudflare** proxies all traffic, stores cover images (R2) and, when enabled, runs Turnstile on forms.
- The **error-reporting server**, when configured, receives scrubbed error reports with no personal data.
- **Umami** analytics, when configured, is self-hosted and cookie-less.
- **Google**, only for hosts who choose "Sign in with Google".

Nothing is shared with advertisers, and there is no code that could: no ad SDKs, no third-party trackers, and the Content-Security-Policy blocks third-party scripts.

## Requests the app can't handle by itself

The privacy page (section 8, "Your rights") gives **hello@comeby.org** for anything the screens don't cover. The address lives in `SITE.contactEmail` (`src/config/site.ts`), and the privacy page turns it into a mail link; change both places if it ever changes. It is on the privacy page only, not in the site footer.

If someone writes in asking for something the screens don't cover:

- A guest who lost their device and left no email cannot prove which response is theirs. Ask the host to remove it, or remove it by id in the database after confirming the details with the requester.
- To remove someone from pasted invitee addresses before the purge: `delete from event_invitees where email = '<lower-cased address>'`.
- To stop all email to an address: add it to `email_suppressions` ([operations.md](operations.md#routine-tasks)).

## Known gaps

- There is no host-facing way to shorten or extend the 90-day period for one event.
- Guest names in old events are kept until the host deletes them.
- Suspending or banning a host account is not built; operators can only hide, restore or delete events.
