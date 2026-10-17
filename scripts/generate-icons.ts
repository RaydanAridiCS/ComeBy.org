/**
 * Generates the PNG app icons in /public and src/app/icon.svg from the Comeby mark.
 * Run with: npx tsx scripts/generate-icons.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Keep in sync with LOGO_PATH in src/components/brand/logo.tsx.
const LOGO_PATH = "M37.83 13.62 A18.5 18.5 0 0 0 20.1 45.58 L28 51.74 L50.96 18.98";
// Comeby Cobalt (brand-500 → brand-600 → brand-800).
const GRADIENT = ["#426ED2", "#224BB2", "#102D78"] as const;

type Shape = "tile" | "square" | "none";

/** `markScale` is the share of the icon the 64-unit mark artboard covers. */
function icon(size: number, shape: Shape, markScale: number, color = "#ffffff"): string {
  const mark = size * markScale;
  const offset = (size - mark) / 2;
  const radius = shape === "tile" ? size * 0.225 : 0;
  const background =
    shape === "none"
      ? ""
      : `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${GRADIENT[0]}"/>
      <stop offset="0.5" stop-color="${GRADIENT[1]}"/>
      <stop offset="1" stop-color="${GRADIENT[2]}"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.2" cy="0" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#shine)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background}
  <g transform="translate(${offset} ${offset}) scale(${mark / 64})">
    <path d="${LOGO_PATH}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const outputs: { file: string; svg: string }[] = [
  { file: "icon-192.png", svg: icon(192, "tile", 0.66) },
  { file: "icon-512.png", svg: icon(512, "tile", 0.66) },
  // Maskable icons get cropped to a circle or squircle: keep the mark inside the 80% safe zone.
  { file: "icon-maskable-512.png", svg: icon(512, "square", 0.56) },
  // iOS rounds the corners itself, so the tile is a full square.
  { file: "apple-touch-icon.png", svg: icon(180, "square", 0.66) },
  // Android notification badge: white on transparent (only the alpha channel is used).
  { file: "badge-72.png", svg: icon(72, "none", 0.98) },
];

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");
  for (const output of outputs) {
    const png = await sharp(Buffer.from(output.svg)).png().toBuffer();
    await writeFile(path.join(publicDir, output.file), png);
    console.log(`✓ public/${output.file}`);
  }
  await writeFile(path.join(process.cwd(), "src", "app", "icon.svg"), icon(64, "tile", 0.72));
  console.log("✓ src/app/icon.svg");
}

void main();
