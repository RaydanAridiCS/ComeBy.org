import type { Repositories } from "../repositories/interfaces";

export type NudgeRecipient = { email: string; name: string | null };

/**
 * Who a nudge reaches: guests who answered "maybe", plus invitee addresses that have not
 * responded at all. Matching is case-insensitive, and each address appears once.
 * `extraInvitees` lets the service count recipients before the new addresses are stored.
 */
export async function collectNudgeRecipients(
  repos: Repositories,
  eventId: string,
  extraInvitees: string[] = [],
): Promise<NudgeRecipient[]> {
  const [maybes, responded, stored] = await Promise.all([
    repos.rsvps.listMaybeRecipients(eventId),
    repos.rsvps.listEmailRecipients(eventId),
    repos.invitees.listEmails(eventId),
  ]);
  const answered = new Set(
    responded.flatMap((guest) => (guest.email ? [guest.email.toLowerCase()] : [])),
  );
  const seen = new Set<string>();
  const recipients: NudgeRecipient[] = [];
  const add = (email: string, name: string | null) => {
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    recipients.push({ email, name });
  };
  for (const guest of maybes) if (guest.email) add(guest.email, guest.name);
  for (const email of [...stored, ...extraInvitees]) {
    if (!answered.has(email.toLowerCase())) add(email, null);
  }
  return recipients;
}
