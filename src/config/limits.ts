/**
 * Free-tier hard limits.
 *
 * These numbers keep Comeby free, fast and safe from abuse. They mirror the
 * "Free-tier hard limits" table in docs/business-plan.md, so update both together.
 * Services enforce them; the UI only displays them.
 */
export const LIMITS = {
  /** Upcoming (not yet ended, not cancelled) events a host can have at once. */
  activeEventsPerHost: 10,
  /** New events a host can create per calendar month (UTC). */
  eventsPerHostPerMonth: 20,
  /** Responses (RSVPs) an event can receive. */
  responsesPerEvent: 200,
  /** Extra guests a single response can bring. */
  maxPlusOnesPerGuest: 5,
  /** Custom questions per event. */
  customQuestionsPerEvent: 3,
  /** Options per multiple-choice custom question. */
  choicesPerQuestion: 6,
  /** Maximum cover image upload size, in bytes. */
  coverImageMaxBytes: 5 * 1024 * 1024,
  /** Event description length, in characters. */
  descriptionMaxLength: 2000,
  /** Guest message length, in characters. */
  guestMessageMaxLength: 300,
  /** "Event changed" or "cancelled" emails a host can send per event. */
  updateEmailsPerEvent: 5,
  /** Instant response alert emails per host per day before switching to a summary. */
  instantAlertEmailsPerHostPerDay: 50,
  /** Responses the same device can submit to the same event per hour. */
  responsesPerDevicePerEventPerHour: 5,
  /** Events one host can create (or duplicate) per hour, on top of the monthly cap. */
  eventCreationsPerHostPerHour: 5,
  /** Whole-account data downloads per host per day. */
  accountExportsPerDay: 5,
  /** Delete or download requests per guest response per hour. */
  guestDataRequestsPerHour: 10,
  /** New host accounts from the same network per day. */
  signupsPerNetworkPerDay: 3,
  /** Reports before an event is automatically hidden for review. */
  reportsBeforeAutoHide: 3,
  /** Days after an event ends before guests' phone numbers and emails are deleted. */
  guestDataRetentionDays: 90,
} as const;

/** Field length limits that aren't part of the published free-tier table. */
export const FIELD_LIMITS = {
  titleMaxLength: 120,
  hostNameMaxLength: 60,
  guestNameMaxLength: 80,
  locationMaxLength: 200,
  slugMinLength: 3,
  slugMaxLength: 48,
  questionLabelMaxLength: 120,
  choiceMaxLength: 60,
  answerMaxLength: 300,
  cancelMessageMaxLength: 500,
  reportDetailsMaxLength: 1000,
} as const;
