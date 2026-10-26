import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { parseGenericEvent, parseResendEvent } from "@/server/adapters/email/webhooks";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/server/security/unsubscribe-token";
import { verifyBearerSecret, verifySvixSignature } from "@/server/security/webhook-signature";
import { queueEmail, unsubscribeLinks } from "@/server/services/email.service";
import { createSuppressionService, isSendAllowed } from "@/server/services/suppression.service";
import { createFakeWorld, type FakeWorld } from "./support/fakes";

describe("isSendAllowed", () => {
  it("sends to addresses that were never suppressed", () => {
    expect(isSendAllowed(null, "guest-update")).toBe(true);
    expect(isSendAllowed(null, "transactional")).toBe(true);
  });

  it("lets an unsubscribed address still get emails it asked for", () => {
    expect(isSendAllowed("unsubscribed", "transactional")).toBe(true);
    expect(isSendAllowed("unsubscribed", "guest-update")).toBe(false);
    expect(isSendAllowed("unsubscribed", "host-alert")).toBe(false);
  });

  it("never emails bounced or complained addresses", () => {
    for (const reason of ["bounced", "complained"] as const) {
      expect(isSendAllowed(reason, "transactional")).toBe(false);
      expect(isSendAllowed(reason, "guest-update")).toBe(false);
    }
  });
});

describe("suppression service", () => {
  let world: FakeWorld;
  let service: ReturnType<typeof createSuppressionService>;

  beforeEach(() => {
    world = createFakeWorld();
    service = createSuppressionService(world.deps);
  });

  it("suppresses a guest who unsubscribes, regardless of letter case", async () => {
    await service.unsubscribe("guest", "  Omar@Example.com ");
    expect(await service.canSend("omar@example.com", "guest-update")).toBe(false);
    expect(await service.canSend("OMAR@example.com", "guest-update")).toBe(false);
    expect(await service.canSend("omar@example.com", "transactional")).toBe(true);
  });

  it("turns a host's email alerts off instead of suppressing their address", async () => {
    world.users.set("host-1", { id: "host-1", name: "Lina", email: "lina@example.com" });
    await service.unsubscribe("host", "lina@example.com");
    expect((await world.deps.repos.userSettings.get("host-1")).emailAlerts).toBe("off");
    expect(await service.canSend("lina@example.com", "transactional")).toBe(true);
  });

  it("ignores a host unsubscribe for an unknown address", async () => {
    await expect(service.unsubscribe("host", "nobody@example.com")).resolves.toBeUndefined();
    expect(world.suppressions.size).toBe(0);
  });

  it("does not downgrade a bounce to an unsubscribe", async () => {
    await service.suppress("a@example.com", "bounced");
    await service.unsubscribe("guest", "a@example.com");
    expect(world.suppressions.get("a@example.com")).toBe("bounced");
  });
});

describe("unsubscribe tokens", () => {
  it("round-trips the scope and a normalised address", () => {
    const token = createUnsubscribeToken("guest", "Omar@Example.com");
    expect(verifyUnsubscribeToken(token)).toEqual({ scope: "guest", email: "omar@example.com" });
  });

  it("rejects tampering with the address, the scope or the signature", () => {
    const token = createUnsubscribeToken("guest", "omar@example.com");
    const [scope, encoded, signature] = token.split(".");
    const otherEmail = Buffer.from("victim@example.com").toString("base64url");
    expect(verifyUnsubscribeToken(`${scope}.${otherEmail}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken(`host.${encoded}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken(`${scope}.${encoded}.${"0".repeat(64)}`)).toBeNull();
    expect(verifyUnsubscribeToken(`${scope}.${encoded}`)).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken(undefined)).toBeNull();
  });
});

describe("queueEmail", () => {
  const email = { subject: "Hi", element: <p>Hello</p> };

  it("adds one-click unsubscribe headers when given a URL", async () => {
    const world = createFakeWorld();
    const links = unsubscribeLinks("guest", "omar@example.com");
    await queueEmail(world.deps.jobs, "omar@example.com", email, {
      category: "guest-update",
      oneClickUnsubscribeUrl: links.oneClick,
    });
    const job = world.jobs[0]?.data as {
      category: string;
      headers: Record<string, string>;
      text: string;
    };
    expect(job.category).toBe("guest-update");
    expect(job.headers["List-Unsubscribe"]).toBe(`<${links.oneClick}>`);
    expect(job.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(links.oneClick).toContain("/api/unsubscribe?t=");
    expect(links.page).toContain("/unsubscribe?t=");
  });

  it("defaults to a transactional email with no unsubscribe headers", async () => {
    const world = createFakeWorld();
    await queueEmail(world.deps.jobs, "omar@example.com", email);
    expect(world.jobs[0]?.data).toMatchObject({ category: "transactional" });
    expect(world.jobs[0]?.data).not.toHaveProperty("headers");
  });

  it("renders a plain-text part alongside the HTML", async () => {
    const world = createFakeWorld();
    await queueEmail(world.deps.jobs, "omar@example.com", email);
    expect(world.jobs[0]?.data).toMatchObject({ text: expect.stringContaining("Hello") });
  });
});

describe("webhook signatures", () => {
  const secret = `whsec_${Buffer.from("super-secret-key-for-tests").toString("base64")}`;
  const now = new Date("2026-10-26T10:00:00Z");
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const body = JSON.stringify({ type: "email.bounced" });
  const sign = (id: string, ts: string, payload: string) =>
    createHmac("sha256", Buffer.from(secret.replace("whsec_", ""), "base64"))
      .update(`${id}.${ts}.${payload}`)
      .digest("base64");

  const verify = (overrides: Partial<Parameters<typeof verifySvixSignature>[0]> = {}) =>
    verifySvixSignature({
      secret,
      id: "msg_1",
      timestamp,
      signatureHeader: `v1,${sign("msg_1", timestamp, body)}`,
      body,
      now,
      ...overrides,
    });

  it("accepts a correct signature, including among several", () => {
    expect(verify()).toBe(true);
    expect(verify({ signatureHeader: `v1,AAAA v1,${sign("msg_1", timestamp, body)}` })).toBe(true);
  });

  it("rejects a forged body, a wrong secret, missing headers and replays", () => {
    expect(verify({ body: JSON.stringify({ type: "email.complained" }) })).toBe(false);
    expect(verify({ secret: `whsec_${Buffer.from("another-secret").toString("base64")}` })).toBe(
      false,
    );
    expect(verify({ signatureHeader: null })).toBe(false);
    expect(verify({ id: null })).toBe(false);
    const old = String(Math.floor(now.getTime() / 1000) - 3600);
    expect(verify({ timestamp: old, signatureHeader: `v1,${sign("msg_1", old, body)}` })).toBe(
      false,
    );
  });

  it("checks bearer secrets in constant time", () => {
    expect(verifyBearerSecret("Bearer sixteen-char-secret", "sixteen-char-secret")).toBe(true);
    expect(verifyBearerSecret("Bearer wrong-char-secret!", "sixteen-char-secret")).toBe(false);
    expect(verifyBearerSecret("sixteen-char-secret", "sixteen-char-secret")).toBe(false);
    expect(verifyBearerSecret(null, "sixteen-char-secret")).toBe(false);
  });
});

describe("webhook events", () => {
  it("suppresses on permanent bounces and complaints from Resend", () => {
    expect(
      parseResendEvent({
        type: "email.bounced",
        data: { to: ["a@example.com"], bounce: { type: "Permanent" } },
      }),
    ).toEqual({ reason: "bounced", emails: ["a@example.com"] });
    expect(parseResendEvent({ type: "email.complained", data: { to: ["b@example.com"] } })).toEqual(
      { reason: "complained", emails: ["b@example.com"] },
    );
  });

  it("ignores transient bounces and other events", () => {
    expect(
      parseResendEvent({
        type: "email.bounced",
        data: { to: ["a@example.com"], bounce: { type: "Transient" } },
      }),
    ).toBeNull();
    expect(
      parseResendEvent({ type: "email.delivered", data: { to: ["a@example.com"] } }),
    ).toBeNull();
    expect(parseResendEvent("nonsense")).toBeNull();
  });

  it("reads the generic webhook body", () => {
    expect(parseGenericEvent({ type: "bounced", email: "a@example.com" })).toEqual({
      reason: "bounced",
      emails: ["a@example.com"],
    });
    expect(parseGenericEvent({ type: "unsubscribed", email: "a@example.com" })).toBeNull();
    expect(parseGenericEvent({ type: "bounced" })).toBeNull();
  });
});
