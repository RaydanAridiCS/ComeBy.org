import { z } from "zod";
import { FIELD_LIMITS, LIMITS } from "@/config/limits";
import { isValidTimeZone } from "@/lib/dates";
import { validateSlug } from "@/lib/slug";

/*
 * Validation shared by the event form (browser) and the server actions.
 * Error messages are translation keys; the form translates them for display.
 */

export const THEMES = [
  "confetti",
  "wild",
  "sunset",
  "midnight",
  "clean",
  "bloom",
  "cyber",
  "aura",
  "oasis",
  "matcha",
] as const;
export type ThemeId = (typeof THEMES)[number];

export const LOCATION_TYPES = ["physical", "online", "tbd"] as const;
export const PHONE_MODES = ["required", "optional", "hidden"] as const;
export const GUEST_LIST_VISIBILITIES = ["names", "count", "hidden"] as const;

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const optionalText = (max: number) =>
  z.string().trim().max(max, { message: "errors.validation" }).default("");

const localDateTime = z.string().regex(LOCAL_DATETIME, { message: "eventForm.errorInvalidDate" });

export const customQuestionSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z
      .string()
      .trim()
      .min(1, { message: "errors.validation" })
      .max(FIELD_LIMITS.questionLabelMaxLength, { message: "errors.validation" }),
    type: z.enum(["text", "choice"]),
    required: z.boolean(),
    choices: z
      .array(z.string().trim().max(FIELD_LIMITS.choiceMaxLength))
      .max(LIMITS.choicesPerQuestion)
      .default([]),
  })
  .superRefine((question, ctx) => {
    if (question.type === "choice" && question.choices.filter(Boolean).length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["choices"],
        message: "eventForm.errorChoicesNeeded",
      });
    }
  });

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "errors.validation" })
      .max(FIELD_LIMITS.titleMaxLength, { message: "errors.validation" }),
    hostName: z
      .string()
      .trim()
      .min(1, { message: "errors.validation" })
      .max(FIELD_LIMITS.hostNameMaxLength, { message: "errors.validation" }),
    description: optionalText(LIMITS.descriptionMaxLength),
    startsAt: localDateTime,
    endsAt: z.union([z.literal(""), localDateTime]).default(""),
    timezone: z.string().refine(isValidTimeZone, { message: "eventForm.errorInvalidTimezone" }),
    locationType: z.enum(LOCATION_TYPES),
    locationName: optionalText(FIELD_LIMITS.locationMaxLength),
    locationAddress: optionalText(FIELD_LIMITS.locationMaxLength),
    onlineUrl: z
      .union([
        z.literal(""),
        z.url({ protocol: /^https?$/, message: "eventForm.errorInvalidUrl" }).trim(),
      ])
      .default(""),
    theme: z.enum(THEMES),
    phoneMode: z.enum(PHONE_MODES),
    allowMessage: z.boolean(),
    allowPlusOnes: z.boolean(),
    maxPlusOnes: z.number().int().min(0).max(LIMITS.maxPlusOnesPerGuest),
    customQuestions: z.array(customQuestionSchema).max(LIMITS.customQuestionsPerEvent),
    guestListVisibility: z.enum(GUEST_LIST_VISIBILITIES),
    reminderEnabled: z.boolean().default(true),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .default("")
      .superRefine((slug, ctx) => {
        if (slug === "") return;
        const problem = validateSlug(slug);
        if (!problem) return;
        const messages = {
          too_short: "eventForm.slugTooShort",
          too_long: "eventForm.slugTooLong",
          invalid_characters: "eventForm.slugInvalid",
          reserved: "eventForm.slugReserved",
        } as const;
        ctx.addIssue({ code: "custom", message: messages[problem] });
      }),
    rsvpDeadline: z.union([z.literal(""), localDateTime]).default(""),
  })
  .superRefine((values, ctx) => {
    // Both values are wall-clock times in the same zone, so string order equals time order.
    if (values.endsAt && values.endsAt <= values.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "eventForm.errorEndBeforeStart" });
    }
    if (values.rsvpDeadline && values.rsvpDeadline > values.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["rsvpDeadline"],
        message: "eventForm.errorDeadlineAfterStart",
      });
    }
    if (values.locationType === "online" && values.onlineUrl === "") {
      ctx.addIssue({ code: "custom", path: ["onlineUrl"], message: "eventForm.errorInvalidUrl" });
    }
  });

/** What the form holds (before defaults are applied). */
export type EventFormInput = z.input<typeof eventFormSchema>;
/** What the server works with (after trimming and defaults). */
export type EventFormValues = z.output<typeof eventFormSchema>;

export const updateEventSchema = z.object({
  eventId: z.uuid(),
  values: eventFormSchema,
  notifyGuests: z.boolean().default(true),
});

/** Longest pasted list we parse. Anything over `LIMITS.inviteesPerEvent` addresses is refused later. */
const INVITEE_TEXT_MAX_LENGTH = 20_000;

/**
 * Turns pasted text (commas, semicolons, spaces or new lines between addresses, optionally
 * `Name <a@b.com>`) into unique lower-cased addresses. Any entry that isn't an address fails.
 */
const inviteeList = z
  .string()
  .max(INVITEE_TEXT_MAX_LENGTH, { message: "eventDashboard.nudgeErrorEmails" })
  .default("")
  .transform((text, ctx) => {
    const emails = new Set<string>();
    for (const token of text.split(/[\s,;]+/)) {
      const entry = token.replace(/^["'<(]+|[>)"']+$/g, "");
      if (!entry) continue;
      if (!z.email().safeParse(entry).success) {
        ctx.addIssue({ code: "custom", message: "eventDashboard.nudgeErrorEmails" });
        return z.NEVER;
      }
      emails.add(entry.toLowerCase());
    }
    return [...emails];
  });

export const nudgeSchema = z.object({
  eventId: z.uuid(),
  invitees: inviteeList,
});

export const cancelEventSchema = z.object({
  eventId: z.uuid(),
  message: z.string().trim().max(FIELD_LIMITS.cancelMessageMaxLength).default(""),
});
