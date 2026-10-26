import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

/** Mirrors how crawlers read the rules: the longest matching rule wins, "$" anchors the end. */
function isAllowed(path: string, allow: string[], disallow: string[]): boolean {
  const matches = (rule: string) =>
    rule.endsWith("$") ? path === rule.slice(0, -1) : path.startsWith(rule);
  const longest = (rules: string[]) =>
    Math.max(-1, ...rules.filter(matches).map((rule) => rule.length));
  return longest(allow) >= longest(disallow);
}

describe("robots.txt and sitemap.xml", () => {
  const rule = (() => {
    const first = robots().rules;
    const single = Array.isArray(first) ? first[0] : first;
    return {
      allow: [single?.allow ?? []].flat(),
      disallow: [single?.disallow ?? []].flat(),
    };
  })();

  it("allow every page the sitemap lists", () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      expect(isAllowed(path, rule.allow, rule.disallow), path).toBe(true);
    }
  });

  it("keep private pages out of the index", () => {
    for (const path of ["/signup", "/login", "/dashboard", "/some-invite", "/r/abc"]) {
      expect(isAllowed(path, rule.allow, rule.disallow), path).toBe(false);
    }
  });
});
