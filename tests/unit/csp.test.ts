import { describe, expect, it } from "vitest";
import { buildCsp, originOf } from "@/config/csp";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.slice(name.length + 1);

describe("buildCsp", () => {
  const production = buildCsp({
    isDev: false,
    umamiOrigin: "https://stats.example.com",
    storageOrigin: "https://cdn.example.com",
  });

  it("locks down plugins, framing, base tags and form targets", () => {
    expect(directive(production, "object-src")).toBe("'none'");
    expect(directive(production, "frame-ancestors")).toBe("'none'");
    expect(directive(production, "base-uri")).toBe("'self'");
    expect(directive(production, "form-action")).toBe("'self'");
  });

  it("allows only the configured third parties", () => {
    expect(directive(production, "script-src")).toBe(
      "'self' 'unsafe-inline' https://challenges.cloudflare.com https://stats.example.com",
    );
    expect(directive(production, "img-src")).toContain("https://cdn.example.com");
    expect(directive(production, "frame-src")).toBe("https://challenges.cloudflare.com");
  });

  it("never allows eval or websockets in production, and upgrades requests", () => {
    expect(production).not.toContain("unsafe-eval");
    expect(directive(production, "connect-src")).not.toContain("ws:");
    expect(production).toContain("upgrade-insecure-requests");
  });

  it("allows eval and websockets for hot reloading in development only", () => {
    const dev = buildCsp({ isDev: true });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
});

describe("originOf", () => {
  it("returns the origin or null", () => {
    expect(originOf("https://cdn.example.com/bucket/x.png")).toBe("https://cdn.example.com");
    expect(originOf(undefined)).toBeNull();
    expect(originOf("nonsense")).toBeNull();
  });
});
