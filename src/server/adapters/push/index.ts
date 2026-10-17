import "server-only";

import webPush, { WebPushError } from "web-push";
import { env } from "@/env";
import { logger } from "@/lib/logger";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when the notification is tapped. */
  url: string;
  tag?: string;
};

export type PushResult = "sent" | "gone" | "failed" | "disabled";

let configured = false;

export function isPushEnabled(): boolean {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

function configure(): boolean {
  if (!isPushEnabled()) return false;
  if (!configured) {
    webPush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      env.VAPID_PRIVATE_KEY ?? "",
    );
    configured = true;
  }
  return true;
}

/**
 * Sends one Web Push notification. Free: no Firebase or paid service involved.
 * Returns "gone" when the browser unsubscribed, so the caller can delete it.
 */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushResult> {
  if (!configure()) return "disabled";
  try {
    await webPush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "sent";
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      return "gone";
    }
    logger.warn({ err: error }, "Push notification failed");
    return "failed";
  }
}
