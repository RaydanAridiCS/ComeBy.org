/**
 * Checks WCAG 2.2 contrast for every invite theme (dev only).
 * Run with: npx tsx scripts/check-theme-contrast.ts
 *
 * Translucent ("glass") cards are composited over the theme's darkest and
 * lightest backdrop colours, so the check covers the worst case.
 */
import { THEME_LIST } from "../src/themes";

type Rgba = [number, number, number, number];

function parse(color: string): Rgba {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1] ?? "0", 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgba?.[1]) {
    const [r = "0", g = "0", b = "0", a = "1"] = rgba[1].split(",").map((part) => part.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  throw new Error(`Unsupported colour: ${color}`);
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3];
  return [
    top[0] * a + bottom[0] * (1 - a),
    top[1] * a + bottom[1] * (1 - a),
    top[2] * a + bottom[2] * (1 - a),
    1,
  ];
}

function luminance([r, g, b]: Rgba): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function ratio(a: Rgba, b: Rgba): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let failures = 0;
for (const theme of THEME_LIST) {
  const backdrops = theme.contrastBackdrops.map(parse);
  const cards = backdrops.map((backdrop) => over(parse(theme.card), backdrop));
  const checks: { label: string; fg: string; min: number; on: Rgba[] }[] = [
    { label: "text on card", fg: theme.foreground, min: 4.5, on: cards },
    { label: "muted on card", fg: theme.muted, min: 4.5, on: cards },
    { label: "accent text on card", fg: theme.accentInk, min: 4.5, on: cards },
    {
      label: "accent text on soft chip",
      fg: theme.accentInk,
      min: 4.5,
      on: cards.map((card) => over(parse(theme.accentSoft), card)),
    },
    {
      label: "button text on accent",
      fg: theme.accentForeground,
      min: 4.5,
      on: cards.map((card) => over(parse(theme.accent), card)),
    },
    { label: "accent vs card (UI, 3:1)", fg: theme.accent, min: 3, on: cards },
  ];
  console.log(`\n${theme.id}`);
  for (const check of checks) {
    const worst = Math.min(...check.on.map((bg) => ratio(over(parse(check.fg), bg), bg)));
    const ok = worst >= check.min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✓" : "✗"} ${check.label.padEnd(26)} ${worst.toFixed(2)} (min ${check.min})`,
    );
  }
}
console.log(failures === 0 ? "\nAll themes pass." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
