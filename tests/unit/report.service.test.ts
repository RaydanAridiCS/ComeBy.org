import { describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { createReportService } from "@/server/services/report.service";
import { createFakeWorld, makeEvent } from "./support/fakes";

describe("report service", () => {
  it(`hides an event after ${LIMITS.reportsBeforeAutoHide} reports`, async () => {
    const world = createFakeWorld();
    const service = createReportService(world.deps);
    const event = makeEvent();
    world.events.set(event.id, event);

    for (let i = 0; i < LIMITS.reportsBeforeAutoHide; i++) {
      expect(world.events.get(event.id)?.hiddenAt).toBeNull();
      await service.report({
        eventId: event.id,
        reason: "scam",
        details: "",
        reporterHash: `r${i}`,
      });
    }
    expect(world.events.get(event.id)?.hiddenAt).toBeInstanceOf(Date);
  });
});
