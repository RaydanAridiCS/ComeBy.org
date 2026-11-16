import { eventEndInstant } from "@/lib/dates";

/**
 * Where an event stands, as hosts and guests should see it. Every surface (the host's event
 * page, the event list, the invite, the link-preview image, the RSVP rules) reads this one
 * value, so they always agree.
 */
export type EventState = "live" | "closed" | "ended" | "cancelled" | "hidden";

type StateInput = {
  status: "active" | "cancelled";
  hiddenAt: Date | null;
  rsvpClosed: boolean;
  rsvpDeadline: Date | null;
  startsAt: Date;
  endsAt: Date | null;
};

/**
 * The order matters when more than one applies: hidden (nobody may see it) beats cancelled
 * (it won't happen) beats ended (it's over) beats closed (it's coming, answers are off).
 */
export function eventState(event: StateInput, now: Date): EventState {
  if (event.hiddenAt) return "hidden";
  if (event.status === "cancelled") return "cancelled";
  if (eventEndInstant(event.startsAt, event.endsAt).getTime() <= now.getTime()) return "ended";
  if (event.rsvpClosed || deadlinePassed(event, now)) return "closed";
  return "live";
}

/** Why a closed event is closed: the host closed it, or its RSVP deadline passed. */
export function closedBy(event: StateInput, now: Date): "host" | "deadline" | null {
  if (eventState(event, now) !== "closed") return null;
  return event.rsvpClosed ? "host" : "deadline";
}

function deadlinePassed(event: Pick<StateInput, "rsvpDeadline">, now: Date): boolean {
  return event.rsvpDeadline !== null && event.rsvpDeadline.getTime() <= now.getTime();
}
