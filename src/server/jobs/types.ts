import type { EmailCategory } from "../services/suppression.service";

/** Every background job and the data it carries. */
export type JobPayloads = {
  /** Deliver one already-rendered email. */
  "email.send": {
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Decides which suppressions apply. Jobs queued before this field existed count as transactional. */
    category?: EmailCategory;
    /** Extra headers, such as `List-Unsubscribe`. */
    headers?: Record<string, string>;
  };
  /** Tell a host (push + email) that someone responded or changed their response. */
  "host.rsvp-alert": {
    eventId: string;
    rsvpId: string;
    kind: "created" | "updated";
    from?: string;
  };
  /** Email opted-in guests that an event changed or was cancelled. */
  "guests.event-update": { eventId: string; kind: "updated" | "cancelled"; changes: string[] };
  /** Daily summary for hosts on "daily" mode, or who went over the instant-email quota. */
  "hosts.daily-digest": Record<string, never>;
  /** Delete guests' phone numbers and emails some time after events end. */
  "privacy.purge-guest-data": Record<string, never>;
  /** Tell operators that an event was hidden automatically and needs review. */
  "moderation.event-hidden": { eventId: string };
  /** Remove expired rate-limit counters. */
  "maintenance.cleanup-rate-limits": Record<string, never>;
};

export type JobName = keyof JobPayloads;

export const JOB_NAMES: readonly JobName[] = [
  "email.send",
  "host.rsvp-alert",
  "guests.event-update",
  "hosts.daily-digest",
  "privacy.purge-guest-data",
  "moderation.event-hidden",
  "maintenance.cleanup-rate-limits",
];

export type EnqueueOptions = {
  /** Seconds to wait before running. */
  startAfterSeconds?: number;
  /** Jobs with the same key are only queued once (e.g. one digest per host per day). */
  singletonKey?: string;
};

/** What services use to schedule work. Implemented by pg-boss; faked in tests. */
export interface JobQueue {
  enqueue<K extends JobName>(
    name: K,
    data: JobPayloads[K],
    options?: EnqueueOptions,
  ): Promise<void>;
}
