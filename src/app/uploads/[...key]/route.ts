import { NextResponse } from "next/server";
import { assertSafeKey, getLocalStorageReader } from "@/server/adapters/storage";

/**
 * Serves uploaded files when STORAGE_PROVIDER=local (development and small setups).
 * In production files are served straight from the bucket (Cloudflare R2).
 */
export async function GET(_request: Request, context: RouteContext<"/uploads/[...key]">) {
  const read = getLocalStorageReader();
  if (!read) return new NextResponse("Not found", { status: 404 });
  const { key: parts } = await context.params;
  const key = parts.join("/");
  try {
    assertSafeKey(key);
    const body = await read(key);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": key.endsWith(".png")
          ? "image/png"
          : key.endsWith(".jpg")
            ? "image/jpeg"
            : "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
