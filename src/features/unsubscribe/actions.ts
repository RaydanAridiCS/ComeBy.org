"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/result";
import { AppError, runAction } from "@/server/actions/run-action";
import { verifyUnsubscribeToken } from "@/server/security/unsubscribe-token";
import { suppressionService } from "@/server/services";

const unsubscribeSchema = z.object({ token: z.string().max(600) });

/** Confirms an unsubscribe. The signed token proves the link came from one of our emails. */
export async function unsubscribeAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { token } = unsubscribeSchema.parse(input);
    const verified = verifyUnsubscribeToken(token);
    if (!verified) throw new AppError("validation");
    await suppressionService.unsubscribe(verified.scope, verified.email);
    return undefined;
  });
}
