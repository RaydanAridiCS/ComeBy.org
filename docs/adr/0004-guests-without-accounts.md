# 0004: Guests without accounts, using per-event edit credentials

**Status:** accepted · 2026-10-17

## Context
Guests must respond in seconds with no sign-up, but should still be able to change their answer, and nobody else should be able to.

## Decision
On a guest's first response we generate a random secret, store only its SHA-256 hash on the RSVP, and set an httpOnly cookie `cb_rsvp_<eventId>` containing `rsvpId.secret`. If the guest leaves an email, the confirmation email includes `/r/<rsvpId.secret>`, which restores the cookie on another device. No SMS verification (it costs money for every message).

## Consequences
- Zero friction for guests; edits are tied to the browser or the email link.
- Clearing cookies without an email means a new response; the host can remove duplicates.
- Abuse is limited by per-device rate limits, Turnstile and the 200-response cap.
