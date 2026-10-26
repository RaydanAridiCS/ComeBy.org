"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { ActionResult } from "@/lib/result";
import { runAction } from "@/server/actions/run-action";
import { auth } from "@/server/auth/auth";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { repositories } from "@/server/services";

const settingsSchema = z.object({
  emailAlerts: z.enum(["instant", "daily", "off"]).optional(),
  pushAlerts: z.boolean().optional(),
});

const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
});

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await repositories.userSettings.upsert(user.id, settingsSchema.parse(input));
    refresh();
    return undefined;
  });
}

export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const subscription = pushSubscriptionSchema.parse(input);
    await repositories.pushSubscriptions.upsert({
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    await repositories.userSettings.upsert(user.id, { pushAlerts: true });
    return undefined;
  });
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireUser();
    await repositories.pushSubscriptions.deleteByEndpoint(z.url().parse(endpoint));
    return undefined;
  });
}

/**
 * Sign-in sessions are listed and revoked on the server by id, so the session tokens
 * themselves never reach the browser.
 */
export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireUser();
    const id = z.string().min(1).max(200).parse(sessionId);
    const requestHeaders = await headers();
    const sessions = await auth.api.listSessions({ headers: requestHeaders });
    const session = sessions.find((candidate) => candidate.id === id);
    if (!session) throw new AppError("not_found");
    await auth.api.revokeSession({ headers: requestHeaders, body: { token: session.token } });
    refresh();
    return undefined;
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  return runAction(async () => {
    await requireUser();
    await auth.api.revokeOtherSessions({ headers: await headers() });
    refresh();
    return undefined;
  });
}
