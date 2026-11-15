# Operator guide

Operators are the people who review reported events on comeby.org. This page explains how someone becomes one and what the moderation page does.

## Becoming an operator

1. Create an ordinary host account and confirm its email.
2. Add that email to the `ADMIN_EMAILS` environment variable (comma-separated, case doesn't matter) and restart the app.
3. Open `/admin`.

Both conditions must hold: the address is on the list **and** the account's email is verified. Signing up with a listed address doesn't help until the confirmation link in that inbox has been clicked.

Everyone else, signed in or not, sees the ordinary "not found" page at `/admin`. There is no link to it anywhere in the app.

To remove an operator, take their address out of `ADMIN_EMAILS` and restart. The reasoning behind this design is in [ADR 0010](adr/0010-operators-by-email-allowlist.md).

## How an event gets reported

Every invite page has a report button. A report has a reason (spam, scam, inappropriate, other) and optional details.

- One network can report a given event once, and can file at most 10 reports a day.
- The **third** report on an event hides it automatically. Guests who open the link then see an "under review" page, nobody can respond, and the nudge and reminders stop.
- When an event is hidden, every address in `ADMIN_EMAILS` gets an email with the event title, the number of reports and a link to `/admin`.

The host is not told who reported them, and reports store only a keyed hash of the reporter's network.

## The moderation page

`/admin` has two parts.

**The queue** lists up to 100 events that have at least one report or are hidden. Hidden events come first, then the most-reported. Each row shows:

- the event title and its link,
- the host's name and email,
- how many reports, broken down by reason,
- the three most recent pieces of free text reporters wrote,
- whether the event is currently hidden.

For each event there are two actions:

| Action | What it does | When to use it |
|---|---|---|
| **Restore** | Deletes the event's reports, sets the count back to zero and shows the event again | The reports were a mistake, or were themselves abuse |
| **Delete** | Deletes the event for good, with its responses, timeline and cover image | The event really is spam, a scam or otherwise breaks the terms |

Delete cannot be undone, and the host is not notified by the app.

**Recent actions** shows the last 30 operator actions: who did what to which event, and when (UTC).

## The audit log

Every restore and delete is written to the `admin_audit_log` table in the same transaction as the action: the operator's id and email, the action, and a copy of the event's id, title and link. The copy is there because a deleted event no longer exists to look up. Entries are kept indefinitely, and survive the operator's own account being deleted.

## What operators cannot do

- **Suspend or ban a host.** Only events can be removed. A host whose event was deleted can create another, within the normal limits (5 an hour, 20 a month).
- **See or edit guests' responses.** The queue shows the event and its reports, not its guest list.
- **Hide an event by hand** before it reaches three reports. If something needs to go immediately, delete it from the queue once it has one report, or, in an emergency, set `hidden_at` in the database:

  ```sql
  update events set hidden_at = now() where slug = 'the-link';
  ```

  The public event is cached, and a change made straight in the database does not clear that cache, so the invite can stay visible until the cached copy expires. A restore or delete through `/admin` clears it immediately, which makes that the reliable route.

## Suggested routine

- Act on "event hidden" emails the same day. A hidden event is offline for a real host until someone looks.
- Glance at the queue weekly for events with one or two reports that never reached three.
- When deleting for a scam, note the host's email from the queue first; there is no other record of who created a deleted event beyond the audit entry.
