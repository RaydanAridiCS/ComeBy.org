import { env } from "@/env";

/** The public link of an event: https://comeby.org/<slug>. */
export function eventUrl(slug: string): string {
  return new URL(`/${slug}`, env.NEXT_PUBLIC_APP_URL).toString();
}

/** comeby.org/<slug> without the protocol, for display. */
export function eventDisplayUrl(slug: string): string {
  return `${new URL(env.NEXT_PUBLIC_APP_URL).host}/${slug}`;
}

/** Opens WhatsApp (app or web) with `text` ready to send to any chat. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Absolute URL for any app path. */
export function absoluteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}
