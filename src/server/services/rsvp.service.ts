import { isValidPhoneNumber } from "libphonenumber-js/min";
import { LIMITS } from "@/config/limits";
import type { RsvpFormValues } from "@/features/rsvp/schema";
import { AppError, LimitReachedError } from "../errors";
import type { EventRecord, RsvpRecord } from "../repositories/types";
import { randomToken, safeEqualHex, sha256 } from "../security/crypto";
import { HOUR_MS, type ServiceDeps } from "./deps";
import { isEventOver } from "./event.service";

/** Why an event isn't accepting responses right now, or null when it is. */
export function rsvpBlockReason(
  event: Pick<
    EventRecord,
    "status" | "rsvpClosed" | "rsvpDeadline" | "startsAt" | "endsAt" | "hiddenAt"
  >,
  now: Date,
): "hidden" | "cancelled" | "closed" | "ended" | null {
  if (event.hiddenAt) return "hidden";
  if (event.status === "cancelled") return "cancelled";
  if (isEventOver(event, now)) return "ended";
  if (event.rsvpClosed) return "closed";
  if (event.rsvpDeadline && event.rsvpDeadline.getTime() <= now.getTime()) return "closed";
  return null;
}

/**
 * Applies the event's own rules to a response: phone required/hidden, messages
 * allowed, +1 limits, required and valid custom answers. Returns clean values.
 */
export function applyEventRules(event: EventRecord, values: RsvpFormValues): RsvpFormValues {
  const fieldErrors: Record<string, string> = {};

  let phone = event.phoneMode === "hidden" ? "" : values.phone;
  if (event.phoneMode === "required" && !phone) fieldErrors.phone = "rsvp.phoneRequired";
  if (phone && !isValidPhoneNumber(phone)) fieldErrors.phone = "rsvp.phoneInvalid";
  if (fieldErrors.phone) phone = "";

  const answers: Record<string, string> = {};
  for (const question of event.customQuestions) {
    const answer = (values.answers[question.id] ?? "").trim();
    if (!answer) {
      if (question.required && values.status !== "not_going") {
        fieldErrors[`answers.${question.id}`] = "rsvp.answerRequired";
      }
      continue;
    }
    if (question.type === "choice" && !question.choices?.includes(answer)) {
      fieldErrors[`answers.${question.id}`] = "rsvp.answerRequired";
      continue;
    }
    answers[question.id] = answer;
  }

  if (Object.keys(fieldErrors).length > 0) throw new AppError("validation", { fieldErrors });

  const going = values.status === "going";
  return {
    ...values,
    phone,
    message: event.allowMessage ? values.message : "",
    plusOnes: going && event.allowPlusOnes ? Math.min(values.plusOnes, event.maxPlusOnes) : 0,
    answers,
  };
}

/** The guest's private edit credential: "<rsvpId>.<secret>". */
export type RsvpCredential = { rsvpId: string; token: string };

export function formatCredential(credential: RsvpCredential): string {
  return `${credential.rsvpId}.${credential.token}`;
}

export function parseCredential(value: string | undefined | null): RsvpCredential | null {
  if (!value) return null;
  const [rsvpId, token] = value.split(".");
  if (!rsvpId || !token) return null;
  return { rsvpId, token };
}

export function createRsvpService(deps: ServiceDeps) {
  const { repos, transaction, jobs, now } = deps;

  async function findByCredential(
    eventId: string,
    credential: RsvpCredential | null,
  ): Promise<RsvpRecord | null> {
    if (!credential) return null;
    const rsvp = await repos.rsvps.findById(credential.rsvpId).catch(() => null);
    if (!rsvp || rsvp.eventId !== eventId) return null;
    if (!safeEqualHex(rsvp.editTokenHash, sha256(credential.token))) return null;
    return rsvp;
  }

  async function loadOpenEvent(eventId: string): Promise<EventRecord> {
    const event = await repos.events.findById(eventId);
    if (!event || event.hiddenAt) throw new AppError("not_found");
    const blocked = rsvpBlockReason(event, now());
    if (blocked === "cancelled") throw new AppError("event_cancelled");
    if (blocked) throw new AppError("rsvp_closed");
    return event;
  }

  return {
    findByCredential,

    /**
     * Creates a response, or updates the guest's existing one when they hold a valid
     * edit credential. `deviceKey` identifies the device for rate limiting.
     */
    async submit(input: {
      eventId: string;
      values: RsvpFormValues;
      credential: RsvpCredential | null;
      deviceKey: string;
    }): Promise<{ rsvp: RsvpRecord; credential: RsvpCredential; created: boolean }> {
      const event = await loadOpenEvent(input.eventId);
      const values = applyEventRules(event, input.values);

      const hits = await repos.rateLimits.hit(
        `rsvp:${event.id}:${input.deviceKey}`,
        HOUR_MS,
        now(),
      );
      if (hits > LIMITS.responsesPerDevicePerEventPerHour) {
        throw new LimitReachedError(
          "responsesPerDevicePerEventPerHour",
          LIMITS.responsesPerDevicePerEventPerHour,
        );
      }

      const fields = {
        status: values.status,
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        message: values.message || null,
        plusOnes: values.plusOnes,
        answers: values.answers,
      };

      const existing = await findByCredential(event.id, input.credential);
      if (existing && input.credential) {
        const rsvp = await transaction(async (tx) => {
          const updated = await tx.rsvps.update(existing.id, fields);
          await tx.activity.add({
            eventId: event.id,
            rsvpId: existing.id,
            type: "rsvp_updated",
            data: { guestName: updated.name, from: existing.status, to: updated.status },
          });
          return updated;
        });
        if (existing.status !== rsvp.status) {
          await jobs.enqueue("host.rsvp-alert", {
            eventId: event.id,
            rsvpId: rsvp.id,
            kind: "updated",
            from: existing.status,
          });
        }
        return { rsvp, credential: input.credential, created: false };
      }

      const token = randomToken();
      const rsvp = await transaction(async (tx) => {
        // Lock the event row so two guests can't both take the last free spot.
        await tx.events.lockById(event.id);
        const count = await tx.rsvps.countByEvent(event.id);
        if (count >= LIMITS.responsesPerEvent) {
          throw new LimitReachedError("responsesPerEvent", LIMITS.responsesPerEvent);
        }
        const created = await tx.rsvps.create({
          ...fields,
          eventId: event.id,
          editTokenHash: sha256(token),
        });
        await tx.activity.add({
          eventId: event.id,
          rsvpId: created.id,
          type: "rsvp_created",
          data: { guestName: created.name, to: created.status },
        });
        return created;
      });
      await jobs.enqueue("host.rsvp-alert", {
        eventId: event.id,
        rsvpId: rsvp.id,
        kind: "created",
      });
      return { rsvp, credential: { rsvpId: rsvp.id, token }, created: true };
    },

    /** Host removes a response (spam or mistakes). */
    async removeByHost(hostId: string, eventId: string, rsvpId: string): Promise<void> {
      const event = await repos.events.findById(eventId);
      if (!event) throw new AppError("not_found");
      if (event.hostId !== hostId) throw new AppError("forbidden");
      const rsvp = await repos.rsvps.findById(rsvpId);
      if (!rsvp || rsvp.eventId !== eventId) throw new AppError("not_found");
      await transaction(async (tx) => {
        await tx.activity.add({
          eventId,
          type: "rsvp_removed",
          data: { guestName: rsvp.name },
        });
        await tx.rsvps.delete(rsvpId);
      });
    },

    /** Everything the host dashboard shows for one event. */
    async dashboardData(hostId: string, eventId: string) {
      const event = await repos.events.findById(eventId);
      if (!event) throw new AppError("not_found");
      if (event.hostId !== hostId) throw new AppError("forbidden");
      const [responses, stats, activity] = await Promise.all([
        repos.rsvps.listByEvent(eventId),
        repos.rsvps.statsByEvent(eventId),
        repos.activity.listByEvent(eventId, 50),
      ]);
      return { event, responses, stats, activity };
    },

    /** Public guest list, following the host's visibility setting. */
    async publicGuestList(event: EventRecord) {
      if (event.guestListVisibility === "hidden") return null;
      const stats = await repos.rsvps.statsByEvent(event.id);
      const names =
        event.guestListVisibility === "names" ? await repos.rsvps.listGoingNames(event.id, 60) : [];
      return { going: stats.guests, names, more: Math.max(0, stats.going - names.length) };
    },
  };
}

export type RsvpService = ReturnType<typeof createRsvpService>;
