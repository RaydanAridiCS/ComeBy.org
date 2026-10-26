import { z } from "zod";
import type { SuppressionReason } from "../../repositories/types";

/** What a provider told us about delivery: these addresses should not be emailed again. */
export type SuppressionEvent = {
  reason: Exclude<SuppressionReason, "unsubscribed">;
  emails: string[];
};

const resendEventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      to: z.array(z.string()).default([]),
      bounce: z.object({ type: z.string().optional() }).partial().optional(),
    })
    .optional(),
});

/**
 * Reads a Resend webhook body. Only permanent bounces and spam complaints suppress an
 * address; a transient bounce (full mailbox, server down) may well work next time.
 */
export function parseResendEvent(payload: unknown): SuppressionEvent | null {
  const parsed = resendEventSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.data) return null;
  const { type, data } = parsed.data;
  if (type === "email.complained") return { reason: "complained", emails: data.to };
  if (type === "email.bounced" && data.bounce?.type?.toLowerCase() !== "transient") {
    return { reason: "bounced", emails: data.to };
  }
  return null;
}

const genericEventSchema = z.object({
  type: z.enum(["bounced", "complained"]),
  email: z.string().min(3).max(320),
});

/**
 * Body for the generic webhook that SMTP setups can call from their provider
 * (or a script): `{ "type": "bounced" | "complained", "email": "guest@example.com" }`.
 */
export function parseGenericEvent(payload: unknown): SuppressionEvent | null {
  const parsed = genericEventSchema.safeParse(payload);
  if (!parsed.success) return null;
  return { reason: parsed.data.type, emails: [parsed.data.email] };
}
