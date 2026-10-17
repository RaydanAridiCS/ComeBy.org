import { z } from "zod";
import { FIELD_LIMITS, LIMITS } from "@/config/limits";

export const RSVP_STATUSES = ["going", "maybe", "not_going"] as const;
export type RsvpStatusValue = (typeof RSVP_STATUSES)[number];

/**
 * A guest's response. Rules that depend on the event (is the phone required? which
 * questions exist?) are checked by the RSVP service, not here.
 */
export const rsvpFormSchema = z.object({
  status: z.enum(RSVP_STATUSES),
  name: z
    .string()
    .trim()
    .min(1, { message: "rsvp.nameRequired" })
    .max(FIELD_LIMITS.guestNameMaxLength, { message: "errors.validation" }),
  phone: z.string().trim().max(32).default(""),
  email: z.union([z.literal(""), z.email({ message: "rsvp.emailInvalid" }).trim()]).default(""),
  message: z
    .string()
    .trim()
    .max(LIMITS.guestMessageMaxLength, { message: "errors.validation" })
    .default(""),
  plusOnes: z.number().int().min(0).max(LIMITS.maxPlusOnesPerGuest).default(0),
  answers: z
    .record(z.string().max(32), z.string().trim().max(FIELD_LIMITS.answerMaxLength))
    .default({}),
});

export type RsvpFormInput = z.input<typeof rsvpFormSchema>;
export type RsvpFormValues = z.output<typeof rsvpFormSchema>;

export const submitRsvpSchema = z.object({
  eventId: z.uuid(),
  values: rsvpFormSchema,
  turnstileToken: z.string().max(4096).optional(),
});

export const reportSchema = z.object({
  eventId: z.uuid(),
  reason: z.enum(["spam", "scam", "inappropriate", "other"]),
  details: z.string().trim().max(FIELD_LIMITS.reportDetailsMaxLength).default(""),
});
