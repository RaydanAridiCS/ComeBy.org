import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEvent,
  isErrorReportingEnabled,
  parseDsn,
  parseStack,
  reportError,
  scrubText,
} from "@/server/monitoring/error-reporting";

// `env` is read once at import time, so tests swap the whole module to change the DSN.
const mockEnv = vi.hoisted(() => ({
  ERROR_REPORTING_DSN: undefined as string | undefined,
  NODE_ENV: "production",
  LOG_LEVEL: "silent",
}));
vi.mock("@/env", () => ({ env: mockEnv }));

describe("parseDsn", () => {
  it("builds the store endpoint and public key", () => {
    expect(parseDsn("https://abc123@errors.example.com/7")).toEqual({
      endpoint: "https://errors.example.com/api/7/store/",
      publicKey: "abc123",
    });
  });

  it("keeps a path prefix (GlitchTip behind a subpath)", () => {
    expect(parseDsn("https://key@example.com/glitchtip/3")?.endpoint).toBe(
      "https://example.com/glitchtip/api/3/store/",
    );
  });

  it("rejects DSNs without a key or project", () => {
    expect(parseDsn("https://errors.example.com/7")).toBeNull();
    expect(parseDsn("https://key@errors.example.com")).toBeNull();
    expect(parseDsn("not a url")).toBeNull();
  });
});

describe("scrubText", () => {
  it("removes emails, phone numbers and token-like strings", () => {
    const scrubbed = scrubText(
      "Failed for lina@example.com, phone +961 70 123 456, token abcdefghijklmnopqrstuvwxyz0123456789",
    );
    expect(scrubbed).not.toContain("lina@example.com");
    expect(scrubbed).not.toContain("961 70");
    expect(scrubbed).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(scrubbed).toContain("[email]");
  });

  it("scrubs a guest credential out of a path", () => {
    const path = "/r/0198a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b.AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    expect(scrubText(path)).toBe("/r/[token].[token]");
  });
});

describe("parseStack", () => {
  it("parses V8 frames oldest-first", () => {
    const frames = parseStack(
      "Error: boom\n    at inner (/app/src/a.ts:10:5)\n    at /app/src/b.ts:20:1",
    );
    expect(frames).toEqual([
      { function: "<anonymous>", filename: "/app/src/b.ts", lineno: 20, colno: 1 },
      { function: "inner", filename: "/app/src/a.ts", lineno: 10, colno: 5 },
    ]);
  });

  it("handles a missing stack", () => {
    expect(parseStack(undefined)).toEqual([]);
  });
});

describe("buildEvent", () => {
  it("carries only the scrubbed error, route and tags", () => {
    const event = buildEvent(
      { name: "TypeError", message: "bad for lina@example.com" },
      { source: "server", route: "/[slug]", method: "GET" },
      { environment: "production", now: new Date("2026-10-26T10:00:00Z"), eventId: "a-b" },
    );
    expect(event.event_id).toBe("ab");
    expect(event.transaction).toBe("/[slug]");
    expect(event.exception.values[0]?.value).toBe("bad for [email]");
    expect(event.tags).toEqual({ source: "server", method: "GET" });
    expect(JSON.stringify(event)).not.toContain("lina@example.com");
  });
});

describe("reportError", () => {
  afterEach(() => {
    mockEnv.ERROR_REPORTING_DSN = undefined;
    vi.unstubAllGlobals();
  });

  it("does nothing when no DSN is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(isErrorReportingEnabled()).toBe(false);
    await reportError(new Error("boom"), { source: "server", route: "/[slug]" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a scrubbed event to the project's store endpoint", async () => {
    mockEnv.ERROR_REPORTING_DSN = "https://publickey@errors.example.com/5";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    expect(isErrorReportingEnabled()).toBe(true);

    await reportError(new TypeError("cannot read lina@example.com"), {
      source: "server",
      route: "/r/[credential]",
      method: "POST",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://errors.example.com/api/5/store/");
    expect((init.headers as Record<string, string>)["x-sentry-auth"]).toContain(
      "sentry_key=publickey",
    );
    const body = JSON.parse(init.body as string);
    expect(body.transaction).toBe("/r/[credential]");
    expect(body.exception.values[0]).toMatchObject({
      type: "TypeError",
      value: "cannot read [email]",
    });
    expect(init.body).not.toContain("lina@example.com");
  });

  it("keeps the details of browser errors, which arrive as plain objects", async () => {
    mockEnv.ERROR_REPORTING_DSN = "https://publickey@errors.example.com/5";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await reportError(
      {
        name: "TypeError",
        message: "x is undefined",
        stack: "TypeError: x\n    at a (/app/a.js:1:2)",
      },
      { source: "client", route: "/[slug]" },
    );

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.exception.values[0]).toMatchObject({ type: "TypeError", value: "x is undefined" });
    expect(body.exception.values[0].stacktrace.frames).toHaveLength(1);
  });

  it("never throws when the reporting server is down", async () => {
    mockEnv.ERROR_REPORTING_DSN = "https://publickey@errors.example.com/5";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(
      reportError(new Error("boom"), { source: "job", job: "email.send" }),
    ).resolves.toBeUndefined();
  });

  it("ignores a malformed DSN", async () => {
    mockEnv.ERROR_REPORTING_DSN = "not-a-dsn";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await reportError(new Error("boom"), { source: "client" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
