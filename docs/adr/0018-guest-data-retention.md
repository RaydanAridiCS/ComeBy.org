# 0018: Guest contact details are deleted 90 days after an event

**Status:** accepted · recorded 2026-11-15 (the decision was made earlier, during the build)

## Context
Guests give a phone number or an email to someone they know, for one event. Once the event is over, Comeby has no reason to hold them, and holding them is the largest privacy risk in the product. The business plan left the period open (30, 90 or 180 days).

## Decision
A daily job, `privacy.purge-guest-data` (03:30 UTC), finds events that ended more than 90 days ago (`LIMITS.guestDataRetentionDays`), or were cancelled and untouched for 90 days, and for each one:

- sets `phone` and `email` to null on every response,
- overwrites each response's edit-token hash,
- deletes the pasted invitee addresses,
- stamps `events.guest_data_purged_at` so it is done once.

An event without an end time counts as ending 6 hours after it starts.

Names, answers, messages and counts are kept, so the host's record of who came stays intact. The suppression list is not touched ([ADR 0013](0013-email-adapter-and-suppression.md)).

Guests don't have to wait: they can delete their own response at any time, which also removes their name from the host's timeline.

## Consequences
- 90 days is long enough for a host to follow up after an event and export the list, and short enough to promise publicly. The number is on the privacy page; changing it means changing both.
- After the purge a guest's edit link and cookie no longer work, so they can't change, download or delete that response themselves. The host still can.
- The promise only holds if backups are also short-lived. Backups must be kept for 30 days at most, which is an operations setting, not something the code enforces ([operations.md](../operations.md#backups)).
- Guest names in old events stay until the host deletes the event or their account. There is no automatic deletion of whole events.
- There is no per-event override. A host cannot keep contact details longer, or have them removed sooner, except by deleting responses.
