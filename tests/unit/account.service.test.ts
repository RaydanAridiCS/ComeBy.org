import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/config/limits";
import { describeUserAgent } from "@/lib/user-agent";
import { createAccountService } from "@/server/services/account.service";
import { createFakeWorld, type FakeWorld, makeEvent } from "./support/fakes";

describe("account export", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createAccountService>;

  beforeEach(() => {
    world = createFakeWorld();
    service = createAccountService(world.deps);
    world.users.set("host-1", { id: "host-1", name: "Lina", email: "lina@example.com" });
    world.users.set("host-2", { id: "host-2", name: "Karim", email: "karim@example.com" });
  });

  const addResponse = (eventId: string, name: string, email: string) => {
    const id = `rsvp-${name}`;
    world.rsvps.set(id, {
      id,
      eventId,
      status: "going",
      name,
      phone: "+14155550123",
      email,
      message: "see you",
      plusOnes: 1,
      answers: {},
      editTokenHash: `secret-hash-${name}`,
      createdAt: new Date("2026-10-18T10:00:00Z"),
      updatedAt: new Date("2026-10-18T10:00:00Z"),
    });
  };

  it("contains the host's profile, events and responses", async () => {
    const mine = makeEvent({ hostId: "host-1", title: "Lina's party" });
    world.events.set(mine.id, mine);
    addResponse(mine.id, "Omar", "omar@example.com");

    const data = await service.exportData("host-1");

    expect(data.profile).toEqual({ name: "Lina", email: "lina@example.com" });
    expect(data.events).toHaveLength(1);
    expect(data.events[0]).toMatchObject({ title: "Lina's party" });
    expect(data.events[0]?.responses[0]).toMatchObject({
      name: "Omar",
      email: "omar@example.com",
      phone: "+14155550123",
    });
  });

  it("never includes another host's events, guests or any edit secret", async () => {
    const mine = makeEvent({ hostId: "host-1" });
    const theirs = makeEvent({ hostId: "host-2", title: "Karim's secret party" });
    world.events.set(mine.id, mine);
    world.events.set(theirs.id, theirs);
    addResponse(mine.id, "Omar", "omar@example.com");
    addResponse(theirs.id, "Stranger", "stranger@example.com");

    const text = JSON.stringify(await service.exportData("host-1"));

    expect(text).toContain("Omar");
    expect(text).not.toContain("Karim");
    expect(text).not.toContain("Stranger");
    expect(text).not.toContain("stranger@example.com");
    expect(text).not.toContain("secret-hash");
  });

  it("fails for an unknown account", async () => {
    await expect(service.exportData("nobody")).rejects.toMatchObject({ code: "not_found" });
  });

  it(`allows ${LIMITS.accountExportsPerDay} downloads a day`, async () => {
    for (let i = 0; i < LIMITS.accountExportsPerDay; i++) await service.exportData("host-1");
    await expect(service.exportData("host-1")).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("user agent labels", () => {
  it("names common browsers and systems", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      ),
    ).toEqual({ browser: "Chrome", os: "Windows" });
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
      ).browser,
    ).toBe("Edge");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ browser: "Safari", os: "iOS" });
    expect(
      describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"),
    ).toEqual({ browser: "Firefox", os: "Linux" });
    expect(
      describeUserAgent("Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36"),
    ).toEqual({
      browser: "Chrome",
      os: "Android",
    });
  });

  it("copes with a missing user agent", () => {
    expect(describeUserAgent(null)).toEqual({ browser: null, os: null });
    expect(describeUserAgent("curl/8.0")).toEqual({ browser: null, os: null });
  });
});
