/**
 * Generates the PNG app icons in /public from the Comeby mark.
 * Run with: npx tsx scripts/generate-icons.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CORAL = "#e85d3a";

function mark(size: number, padding: number, background: string | null): string {
  const inner = size - padding * 2;
  const scale = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" rx="${background === CORAL ? 0 : size * 0.22}" fill="${background}"/>` : ""}
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <rect x="2" y="3" width="28" height="22" rx="9" fill="${background === CORAL ? "#ffffff" : CORAL}"/>
    <path d="M10 25 L8 30 L15 25 Z" fill="${background === CORAL ? "#ffffff" : CORAL}"/>
    <path d="M10.5 14.5 L14.5 18.5 L22 10.5" fill="none" stroke="${background === CORAL ? CORAL : "#ffffff"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const outputs: { file: string; size: number; padding: number; background: string | null }[] = [
  { file: "icon-192.png", size: 192, padding: 24, background: "#ffffff" },
  { file: "icon-512.png", size: 512, padding: 64, background: "#ffffff" },
  { file: "icon-maskable-512.png", size: 512, padding: 112, background: CORAL },
  { file: "apple-touch-icon.png", size: 180, padding: 22, background: "#ffffff" },
  { file: "badge-72.png", size: 72, padding: 6, background: null },
];

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");
  for (const output of outputs) {
    const png = await sharp(Buffer.from(mark(output.size, output.padding, output.background)))
      .png()
      .toBuffer();
    await writeFile(path.join(publicDir, output.file), png);
    console.log(`✓ public/${output.file}`);
  }
  await writeFile(path.join(process.cwd(), "src", "app", "icon.svg"), mark(64, 4, null));
  console.log("✓ src/app/icon.svg");
}

void main();
