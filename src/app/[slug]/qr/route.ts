import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getPublicEvent } from "@/features/events/queries";
import { eventUrl } from "@/lib/share";

/** A printable QR code (PNG) that opens the invite. Generated on our own server. */
export async function GET(_request: Request, context: RouteContext<"/[slug]/qr">) {
  const { slug } = await context.params;
  const event = await getPublicEvent(slug.toLowerCase());
  if (!event || event.hiddenAt) return new NextResponse("Not found", { status: 404 });

  const png = await QRCode.toBuffer(eventUrl(event.slug), {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${event.slug}-qr.png"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
