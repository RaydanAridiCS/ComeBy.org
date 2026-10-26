import { LIMITS } from "@/config/limits";
import type { EventFormValues } from "@/features/events/schema";
import { startOfUtcMonth, zonedInputToDate } from "@/lib/dates";
import { generateSlug } from "@/lib/slug";
import { AppError, LimitReachedError } from "../errors";
import type { EventPatch, EventRecord, NewEventRecord } from "../repositories/types";
import { HOUR_MS, type ServiceDeps } from "./deps";

/** Changes guests should hear about. Used for the "Updated" banner and update emails. */
export type NotableChange = "time" | "location" | "title" | "details";

function toDateOrThrow(value: string, timezone: string, field: string): Date {
  const date = zonedInputToDate(value, timezone);
  if (!date) {
    throw new AppError("validation", { fieldErrors: { [field]: "eventForm.errorInvalidDate" } });
  }
  return date;
}

/** Maps validated form values to database columns. */
export function formValuesToColumns(values: EventFormValues) {
  const startsAt = toDateOrThrow(values.startsAt, values.timezone, "startsAt");
  const endsAt = values.endsAt ? toDateOrThrow(values.endsAt, values.timezone, "endsAt") : null;
  const rsvpDeadline = values.rsvpDeadline
    ? toDateOrThrow(values.rsvpDeadline, values.timezone, "rsvpDeadline")
    : null;
  const physical = values.locationType === "physical";
  return {
    title: values.title,
    hostName: values.hostName,
    description: values.description,
    startsAt,
    endsAt,
    timezone: values.timezone,
    locationType: values.locationType,
    locationName: physical ? values.locationName || null : null,
    locationAddress: physical ? values.locationAddress || null : null,
    onlineUrl: values.locationType === "online" ? values.onlineUrl || null : null,
    theme: values.theme,
    phoneMode: values.phoneMode,
    allowMessage: values.allowMessage,
    allowPlusOnes: values.allowPlusOnes,
    maxPlusOnes: values.allowPlusOnes ? Math.max(1, values.maxPlusOnes) : 0,
    customQuestions: values.customQuestions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      ...(question.type === "choice" ? { choices: question.choices.filter(Boolean) } : {}),
    })),
    guestListVisibility: values.guestListVisibility,
    rsvpDeadline,
  } satisfies EventPatch;
}

/** Which guest-facing details differ between the stored event and the new values. */
export function detectNotableChanges(
  before: EventRecord,
  after: ReturnType<typeof formValuesToColumns>,
): NotableChange[] {
  const changes: NotableChange[] = [];
  if (
    before.startsAt.getTime() !== after.startsAt.getTime() ||
    (before.endsAt?.getTime() ?? null) !== (after.endsAt?.getTime() ?? null) ||
    before.timezone !== after.timezone
  ) {
    changes.push("time");
  }
  if (
    before.locationType !== after.locationType ||
    before.locationName !== after.locationName ||
    before.locationAddress !== after.locationAddress ||
    before.onlineUrl !== after.onlineUrl
  ) {
    changes.push("location");
  }
  if (before.title !== after.title) changes.push("title");
  if (before.description !== after.description) changes.push("details");
  return changes;
}

export function isEventOver(event: Pick<EventRecord, "startsAt" | "endsAt">, now: Date): boolean {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 6 * 60 * 60 * 1000);
  return end.getTime() <= now.getTime();
}

export function createEventService(deps: ServiceDeps) {
  const { repos, transaction, jobs, now } = deps;

  async function assertCanCreate(hostId: string): Promise<void> {
    const at = now();
    const [active, thisMonth] = await Promise.all([
      repos.events.countActiveByHost(hostId, at),
      repos.events.countCreatedByHostSince(hostId, startOfUtcMonth(at)),
    ]);
    if (active >= LIMITS.activeEventsPerHost) {
      throw new LimitReachedError("activeEventsPerHost", LIMITS.activeEventsPerHost);
    }
    if (thisMonth >= LIMITS.eventsPerHostPerMonth) {
      throw new LimitReachedError("eventsPerHostPerMonth", LIMITS.eventsPerHostPerMonth);
    }
    // Counted only after the quota checks, so a host at their cap isn't also locked out later.
    const recent = await repos.rateLimits.hit(`event-create:${hostId}`, HOUR_MS, at);
    if (recent > LIMITS.eventCreationsPerHostPerHour) throw new AppError("rate_limited");
  }

  async function resolveSlug(
    requested: string,
    title: string,
    currentId?: string,
  ): Promise<string> {
    if (requested) {
      const existing = await repos.events.findBySlug(requested);
      if (existing && existing.id !== currentId) {
        throw new AppError("slug_taken", { fieldErrors: { slug: "eventForm.slugTaken" } });
      }
      return requested;
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug(title);
      if (!(await repos.events.slugExists(candidate))) return candidate;
    }
    throw new AppError("conflict", { message: "Could not generate a unique link" });
  }

  async function getOwned(hostId: string, eventId: string): Promise<EventRecord> {
    const event = await repos.events.findById(eventId);
    if (!event) throw new AppError("not_found");
    if (event.hostId !== hostId) throw new AppError("forbidden");
    return event;
  }

  /**
   * Emails opted-in guests about a change, if the event still has update emails left.
   * Returns whether emails were queued.
   */
  async function queueGuestUpdate(
    event: EventRecord,
    kind: "updated" | "cancelled",
    changes: NotableChange[],
  ): Promise<boolean> {
    if (event.updateEmailsSent >= LIMITS.updateEmailsPerEvent) return false;
    await repos.events.incrementUpdateEmailsSent(event.id);
    await repos.activity.add({ eventId: event.id, type: "update_email_sent", data: { changes } });
    await jobs.enqueue("guests.event-update", { eventId: event.id, kind, changes });
    return true;
  }

  return {
    getOwned,
    queueGuestUpdate,

    /** Usage numbers shown on the dashboard next to the limits. */
    async usage(hostId: string) {
      const at = now();
      const [active, thisMonth] = await Promise.all([
        repos.events.countActiveByHost(hostId, at),
        repos.events.countCreatedByHostSince(hostId, startOfUtcMonth(at)),
      ]);
      return {
        active,
        activeMax: LIMITS.activeEventsPerHost,
        monthly: thisMonth,
        monthlyMax: LIMITS.eventsPerHostPerMonth,
      };
    },

    async listForHost(hostId: string) {
      return repos.events.listByHostWithStats(hostId);
    },

    /** The public invite by link. Returns null when it doesn't exist. */
    async findPublicBySlug(slug: string) {
      return repos.events.findBySlug(slug.toLowerCase());
    },

    async create(hostId: string, values: EventFormValues): Promise<EventRecord> {
      await assertCanCreate(hostId);
      const columns = formValuesToColumns(values);
      const slug = await resolveSlug(values.slug, values.title);
      return transaction(async (tx) => {
        const event = await tx.events.create({ ...columns, hostId, slug } satisfies NewEventRecord);
        await tx.activity.add({ eventId: event.id, type: "event_created" });
        return event;
      });
    },

    async update(
      hostId: string,
      eventId: string,
      values: EventFormValues,
      options: { notifyGuests: boolean },
    ): Promise<{ event: EventRecord; changes: NotableChange[]; emailed: boolean }> {
      const existing = await getOwned(hostId, eventId);
      const columns = formValuesToColumns(values);
      const slug = values.slug
        ? await resolveSlug(values.slug, values.title, eventId)
        : existing.slug;
      const changes = detectNotableChanges(existing, columns);
      const at = now();

      const event = await transaction(async (tx) => {
        const updated = await tx.events.update(eventId, {
          ...columns,
          slug,
          ...(changes.length > 0
            ? { lastNotableUpdateAt: at, lastNotableUpdateSummary: changes.join(",") }
            : {}),
        });
        await tx.activity.add({ eventId, type: "event_updated", data: { changes } });
        return updated;
      });

      const emailed =
        options.notifyGuests &&
        changes.length > 0 &&
        event.status === "active" &&
        (await queueGuestUpdate(event, "updated", changes));
      return { event, changes, emailed };
    },

    async cancel(hostId: string, eventId: string, message: string): Promise<EventRecord> {
      const existing = await getOwned(hostId, eventId);
      if (existing.status === "cancelled") return existing;
      const event = await transaction(async (tx) => {
        const updated = await tx.events.update(eventId, {
          status: "cancelled",
          cancelMessage: message || null,
          rsvpClosed: true,
        });
        await tx.activity.add({ eventId, type: "event_cancelled" });
        return updated;
      });
      await queueGuestUpdate(event, "cancelled", []);
      return event;
    },

    async setRsvpClosed(hostId: string, eventId: string, closed: boolean): Promise<EventRecord> {
      const event = await getOwned(hostId, eventId);
      if (event.status === "cancelled") throw new AppError("event_cancelled");
      return repos.events.update(eventId, { rsvpClosed: closed });
    },

    /** Copies an event's settings into a new event with a fresh link. Limits apply. */
    async duplicate(hostId: string, eventId: string): Promise<EventRecord> {
      const source = await getOwned(hostId, eventId);
      await assertCanCreate(hostId);
      const slug = await resolveSlug("", source.title);
      return transaction(async (tx) => {
        const copy = await tx.events.create({
          hostId,
          slug,
          title: source.title,
          description: source.description,
          hostName: source.hostName,
          startsAt: source.startsAt,
          endsAt: source.endsAt,
          timezone: source.timezone,
          locationType: source.locationType,
          locationName: source.locationName,
          locationAddress: source.locationAddress,
          onlineUrl: source.onlineUrl,
          theme: source.theme,
          coverImageKey: null,
          guestListVisibility: source.guestListVisibility,
          phoneMode: source.phoneMode,
          allowMessage: source.allowMessage,
          allowPlusOnes: source.allowPlusOnes,
          maxPlusOnes: source.maxPlusOnes,
          customQuestions: source.customQuestions,
          rsvpDeadline: null,
        });
        await tx.activity.add({ eventId: copy.id, type: "event_created" });
        return copy;
      });
    },

    /** Deletes an event and returns its cover key so the caller can remove the file. */
    async delete(hostId: string, eventId: string): Promise<{ coverImageKey: string | null }> {
      const event = await getOwned(hostId, eventId);
      await repos.events.delete(eventId);
      return { coverImageKey: event.coverImageKey };
    },

    /** Stores a new cover; returns the previous key so the caller can delete that file. */
    async setCoverImage(
      hostId: string,
      eventId: string,
      key: string | null,
    ): Promise<{ previousKey: string | null }> {
      const event = await getOwned(hostId, eventId);
      await repos.events.update(eventId, { coverImageKey: key });
      return { previousKey: event.coverImageKey };
    },
  };
}

export type EventService = ReturnType<typeof createEventService>;
