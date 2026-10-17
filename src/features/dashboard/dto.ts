import "server-only";

import { LIMITS } from "@/config/limits";
import { formatEventWhen } from "@/lib/dates";
import { eventDisplayUrl, eventUrl } from "@/lib/share";
import type {
  ActivityRecord,
  EventRecord,
  RsvpRecord,
  RsvpStats,
} from "@/server/repositories/types";
import { isEventOver } from "@/server/services/event.service";
import { rsvpBlockReason } from "@/server/services/rsvp.service";

/*
 * Plain, JSON-safe data for the host dashboard. Used both for the first server
 * render and for the auto-refresh endpoint, so they can never drift apart.
 */

export type DashboardResponse = {
  id: string;
  status: RsvpRecord["status"];
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  plusOnes: number;
  answers: { label: string; value: string }[];
  createdAt: string;
  updatedAt: string;
  changed: boolean;
};

export type DashboardActivity = {
  id: string;
  type: ActivityRecord["type"];
  data: ActivityRecord["data"];
  createdAt: string;
};

export type DashboardData = {
  event: {
    id: string;
    slug: string;
    title: string;
    when: string;
    url: string;
    displayUrl: string;
    status: EventRecord["status"];
    rsvpClosed: boolean;
    blocked: ReturnType<typeof rsvpBlockReason>;
    over: boolean;
    hidden: boolean;
    cancelMessage: string | null;
    lastNotableUpdateSummary: string | null;
    hasQuestions: boolean;
    phoneMode: EventRecord["phoneMode"];
  };
  stats: RsvpStats;
  capacity: { used: number; max: number };
  responses: DashboardResponse[];
  activity: DashboardActivity[];
  /** When this snapshot was taken (ISO). */
  at: string;
};

export function toDashboardData(
  input: {
    event: EventRecord;
    responses: RsvpRecord[];
    stats: RsvpStats;
    activity: ActivityRecord[];
  },
  now: Date,
): DashboardData {
  const { event } = input;
  const questionLabels = new Map(event.customQuestions.map((q) => [q.id, q.label]));
  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      when: formatEventWhen(event.startsAt, event.endsAt, event.timezone),
      url: eventUrl(event.slug),
      displayUrl: eventDisplayUrl(event.slug),
      status: event.status,
      rsvpClosed: event.rsvpClosed,
      blocked: rsvpBlockReason(event, now),
      over: isEventOver(event, now),
      hidden: Boolean(event.hiddenAt),
      cancelMessage: event.cancelMessage,
      lastNotableUpdateSummary: event.lastNotableUpdateSummary,
      hasQuestions: event.customQuestions.length > 0,
      phoneMode: event.phoneMode,
    },
    stats: input.stats,
    capacity: { used: input.responses.length, max: LIMITS.responsesPerEvent },
    responses: input.responses.map((rsvp) => ({
      id: rsvp.id,
      status: rsvp.status,
      name: rsvp.name,
      phone: rsvp.phone,
      email: rsvp.email,
      message: rsvp.message,
      plusOnes: rsvp.plusOnes,
      answers: Object.entries(rsvp.answers)
        .filter(([id]) => questionLabels.has(id))
        .map(([id, value]) => ({ label: questionLabels.get(id) ?? id, value })),
      createdAt: rsvp.createdAt.toISOString(),
      updatedAt: rsvp.updatedAt.toISOString(),
      changed: rsvp.updatedAt.getTime() - rsvp.createdAt.getTime() > 1000,
    })),
    activity: input.activity.map((item) => ({
      id: item.id,
      type: item.type,
      data: item.data,
      createdAt: item.createdAt.toISOString(),
    })),
    at: now.toISOString(),
  };
}
