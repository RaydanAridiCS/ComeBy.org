import { beforeEach, describe, expect, it } from "vitest";
import { rsvpFormSchema } from "@/features/rsvp/schema";
import { createAccountService } from "@/server/services/account.service";
import { createRsvpService } from "@/server/services/rsvp.service";
import { createEvent, createHost, createIntegrationDeps, resetDatabase } from "./support";

beforeEach(resetDatabase);

const guest = (overrides: Record<string, unknown> = {}) =>
  rsvpFormSchema.parse({ status: "going", name: "Omar", ...overrides });

describe("account export on a real database", () => {
  it("exports a host's own events and responses and nothing belonging to another host", async () => {
    const { deps } = createIntegrationDeps();
    const account = createAccountService(deps);
    const rsvp = createRsvpService(deps);
    const lina = await createHost({ name: "Lina" });
    const karim = await createHost({ name: "Karim" });
    const linasEvent = await createEvent(lina.id, { title: "Lina's picnic" });
    const karimsEvent = await createEvent(karim.id, { title: "Karim's secret dinner" });
    await rsvp.submit({
      eventId: linasEvent.id,
      values: guest({ name: "Omar", email: "omar@example.com", phone: "+14155550123" }),
      credential: null,
      deviceKey: "a",
    });
    await rsvp.submit({
      eventId: karimsEvent.id,
      values: guest({ name: "Stranger", email: "stranger@example.com" }),
      credential: null,
      deviceKey: "b",
    });

    const data = await account.exportData(lina.id);
    const text = JSON.stringify(data);

    expect(data.profile.email).toBe(lina.email);
    expect(data.events.map((event) => event.title)).toEqual(["Lina's picnic"]);
    expect(data.events[0]?.responses[0]).toMatchObject({
      name: "Omar",
      email: "omar@example.com",
      phone: "+14155550123",
    });
    expect(text).not.toContain("Karim");
    expect(text).not.toContain("Stranger");
    expect(text).not.toContain("stranger@example.com");
    expect(text).not.toContain("editTokenHash");
  });
});
