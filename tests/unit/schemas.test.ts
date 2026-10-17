import { describe, expect, it } from "vitest";
import { newEventDefaults } from "@/features/events/form-values";
import { eventFormSchema } from "@/features/events/schema";
import { rsvpFormSchema } from "@/features/rsvp/schema";

const valid = {
  ...newEventDefaults("Lina"),
  title: "Picnic",
  startsAt: "2026-11-05T16:00",
  timezone: "Europe/London",
};

describe("event form schema", () => {
  it("accepts a minimal event", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the end to be after the start", () => {
    const result = eventFormSchema.safeParse({ ...valid, endsAt: "2026-11-05T15:00" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("eventForm.errorEndBeforeStart");
  });

  it("requires the RSVP deadline to be before the start", () => {
    const result = eventFormSchema.safeParse({ ...valid, rsvpDeadline: "2026-11-06T10:00" });
    expect(result.error?.issues[0]?.message).toBe("eventForm.errorDeadlineAfterStart");
  });

  it("rejects reserved event links", () => {
    const result = eventFormSchema.safeParse({ ...valid, slug: "login" });
    expect(result.error?.issues[0]?.message).toBe("eventForm.slugReserved");
  });

  it("lowercases custom links", () => {
    expect(eventFormSchema.parse({ ...valid, slug: "Linas-BDay" }).slug).toBe("linas-bday");
  });

  it("allows at most 3 custom questions", () => {
    const question = {
      id: "q",
      label: "Food?",
      type: "text" as const,
      required: false,
      choices: [],
    };
    const result = eventFormSchema.safeParse({
      ...valid,
      customQuestions: [question, question, question, question],
    });
    expect(result.success).toBe(false);
  });

  it("needs two choices for multiple-choice questions", () => {
    const result = eventFormSchema.safeParse({
      ...valid,
      customQuestions: [
        { id: "q", label: "Day?", type: "choice", required: true, choices: ["Sat"] },
      ],
    });
    expect(result.error?.issues[0]?.message).toBe("eventForm.errorChoicesNeeded");
  });

  it("requires a link for online events", () => {
    const result = eventFormSchema.safeParse({ ...valid, locationType: "online", onlineUrl: "" });
    expect(result.success).toBe(false);
  });
});

describe("RSVP form schema", () => {
  it("requires a name", () => {
    const result = rsvpFormSchema.safeParse({ status: "going", name: "  " });
    expect(result.error?.issues[0]?.message).toBe("rsvp.nameRequired");
  });

  it("limits +1s and message length", () => {
    expect(rsvpFormSchema.safeParse({ status: "going", name: "Omar", plusOnes: 6 }).success).toBe(
      false,
    );
    expect(
      rsvpFormSchema.safeParse({ status: "going", name: "Omar", message: "x".repeat(301) }).success,
    ).toBe(false);
  });
});
