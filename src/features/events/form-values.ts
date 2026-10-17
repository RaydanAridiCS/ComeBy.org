import { dateToZonedInput } from "@/lib/dates";
import type { EventRecord } from "@/server/repositories/types";
import type { EventFormInput } from "./schema";

/** Sensible defaults for a brand-new event (the time zone is filled in by the browser). */
export function newEventDefaults(hostName: string): EventFormInput {
  return {
    title: "",
    hostName,
    description: "",
    startsAt: "",
    endsAt: "",
    timezone: "",
    locationType: "physical",
    locationName: "",
    locationAddress: "",
    onlineUrl: "",
    theme: "confetti",
    phoneMode: "optional",
    allowMessage: true,
    allowPlusOnes: false,
    maxPlusOnes: 0,
    customQuestions: [],
    guestListVisibility: "count",
    slug: "",
    rsvpDeadline: "",
  };
}

/** Converts a stored event back into form values (local times in the event's zone). */
export function eventToFormValues(event: EventRecord): EventFormInput {
  return {
    title: event.title,
    hostName: event.hostName,
    description: event.description,
    startsAt: dateToZonedInput(event.startsAt, event.timezone),
    endsAt: event.endsAt ? dateToZonedInput(event.endsAt, event.timezone) : "",
    timezone: event.timezone,
    locationType: event.locationType,
    locationName: event.locationName ?? "",
    locationAddress: event.locationAddress ?? "",
    onlineUrl: event.onlineUrl ?? "",
    theme: event.theme,
    phoneMode: event.phoneMode,
    allowMessage: event.allowMessage,
    allowPlusOnes: event.allowPlusOnes,
    maxPlusOnes: event.maxPlusOnes,
    customQuestions: event.customQuestions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      choices: question.choices ?? [],
    })),
    guestListVisibility: event.guestListVisibility,
    slug: event.slug,
    rsvpDeadline: event.rsvpDeadline ? dateToZonedInput(event.rsvpDeadline, event.timezone) : "",
  };
}
