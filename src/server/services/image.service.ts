import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { LIMITS } from "@/config/limits";
import { AppError, LimitReachedError } from "../errors";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;

/**
 * Validates an uploaded cover image and converts it to a compact WebP.
 * Metadata (including GPS location) is stripped. Returns the storage key and bytes.
 */
export async function processCoverImage(file: File): Promise<{ key: string; body: Buffer }> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new AppError("validation", { fieldErrors: { cover: "eventForm.coverWrongType" } });
  }
  if (file.size > LIMITS.coverImageMaxBytes) {
    throw new LimitReachedError("coverImageMaxBytes", LIMITS.coverImageMaxBytes / (1024 * 1024));
  }
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const body = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { key: `covers/${randomUUID()}.webp`, body };
  } catch {
    throw new AppError("validation", { fieldErrors: { cover: "eventForm.coverWrongType" } });
  }
}
