# 0011: Guest reminders by periodic sweep

**Status:** accepted · 2026-10-26

## Context
Guests who left an email get one reminder shortly before the event, and hosts can switch it off. The obvious design is a delayed pg-boss job per event, scheduled on create and moved on edit. But the job queue has no way to cancel or replace a job (`JobQueue` in `src/server/jobs/types.ts` only enqueues), so a time edit, a cancellation or a hidden event would leave stale jobs that each have to re-check the event anyway.

## Decision
A cron job, `guests.reminders-due`, runs every 15 minutes. It asks the database for active, visible events that start in the next 24 hours (`LIMITS.reminderHoursBefore`) and still have a going or maybe guest with an email who hasn't been reminded. For each event it claims those guests with one `UPDATE … SET reminder_sent_at … WHERE reminder_sent_at IS NULL … RETURNING` and queues an `email.send` job per claimed guest.

- The event time is read live, so editing it moves the reminder with no rescheduling. Cancelling, hiding or switching the reminder off stops it because the query filters on those fields.
- `rsvps.reminder_sent_at` guarantees one reminder per guest, even if two sweeps overlap (the claim is atomic).
- Guests who responded less than `reminderMinGuestAgeHours` (2) ago are skipped, so nobody is reminded minutes after their confirmation.
- Reminders use the `guest-update` email category: an address that unsubscribed from updates, bounced or complained is skipped by the existing suppression check in the `email.send` job.

The host's one-time "nudge" uses a regular job (`guests.nudge`), guarded by an atomic claim on `events.nudge_sent_at`. Pasted invitee addresses are stored in `event_invitees` and deleted with the other guest contact details by the 90-day purge.

## Consequences
- Reminders can be up to 15 minutes late. For a "tomorrow" email that is fine.
- A crash between claiming a guest and queueing their email loses that guest's reminder (at-most-once), which is better than sending two.
- A host who moves an event after the reminder went out does not trigger a second reminder; the update email (limited to 5 per event) covers changes.
- Each sweep looks at up to 200 events; a bigger backlog drains over the next sweeps.
