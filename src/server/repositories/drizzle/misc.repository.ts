import { eq, lt, sql } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import {
  emailSuppressions,
  eventInvitees,
  pushSubscriptions,
  rateLimits,
  reports,
} from "@/db/schema";
import type {
  EmailSuppressionRepository,
  InviteeRepository,
  PushSubscriptionRepository,
  RateLimitRepository,
  ReportRepository,
} from "../interfaces";

export function createPushSubscriptionRepository(
  db: DatabaseOrTransaction,
): PushSubscriptionRepository {
  return {
    async upsert(input) {
      await db
        .insert(pushSubscriptions)
        .values(input)
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: { userId: input.userId, p256dh: input.p256dh, auth: input.auth },
        });
    },

    async listByUser(userId) {
      return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    },

    async deleteByEndpoint(endpoint) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    },
  };
}

export function createInviteeRepository(db: DatabaseOrTransaction): InviteeRepository {
  return {
    async addMany(eventId, emails) {
      if (emails.length === 0) return;
      await db
        .insert(eventInvitees)
        .values(emails.map((email) => ({ eventId, email: email.toLowerCase() })))
        .onConflictDoNothing({ target: [eventInvitees.eventId, eventInvitees.email] });
    },

    async listEmails(eventId) {
      const rows = await db
        .select({ email: eventInvitees.email })
        .from(eventInvitees)
        .where(eq(eventInvitees.eventId, eventId));
      return rows.map((row) => row.email);
    },

    async deleteByEvent(eventId) {
      await db.delete(eventInvitees).where(eq(eventInvitees.eventId, eventId));
    },
  };
}

export function createReportRepository(db: DatabaseOrTransaction): ReportRepository {
  return {
    async create(input) {
      const rows = await db
        .insert(reports)
        .values(input)
        .onConflictDoNothing({ target: [reports.eventId, reports.reporterHash] })
        .returning({ id: reports.id });
      return rows.length > 0;
    },
  };
}

/**
 * Fixed-window counters. The window start is baked into the key, so each window
 * gets a fresh row and expired rows are swept by a background job.
 */
export function createRateLimitRepository(db: DatabaseOrTransaction): RateLimitRepository {
  const windowKey = (key: string, windowMs: number, now: Date) =>
    `${key}@${Math.floor(now.getTime() / windowMs)}`;

  return {
    async hit(key, windowMs, now) {
      const fullKey = windowKey(key, windowMs, now);
      const expiresAt = new Date((Math.floor(now.getTime() / windowMs) + 1) * windowMs);
      const [row] = await db
        .insert(rateLimits)
        .values({ key: fullKey, count: 1, expiresAt })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: sql`${rateLimits.count} + 1` },
        })
        .returning({ count: rateLimits.count });
      return row?.count ?? 1;
    },

    async peek(key, windowMs, now) {
      const [row] = await db
        .select({ count: rateLimits.count, expiresAt: rateLimits.expiresAt })
        .from(rateLimits)
        .where(eq(rateLimits.key, windowKey(key, windowMs, now)))
        .limit(1);
      if (!row || row.expiresAt <= now) return 0;
      return row.count;
    },

    async deleteExpired(now) {
      const rows = await db
        .delete(rateLimits)
        .where(lt(rateLimits.expiresAt, now))
        .returning({ key: rateLimits.key });
      return rows.length;
    },
  };
}

export function createEmailSuppressionRepository(
  db: DatabaseOrTransaction,
): EmailSuppressionRepository {
  return {
    async find(email) {
      const [row] = await db
        .select({ reason: emailSuppressions.reason })
        .from(emailSuppressions)
        .where(eq(emailSuppressions.email, email))
        .limit(1);
      return row?.reason ?? null;
    },

    async add(email, reason) {
      await db
        .insert(emailSuppressions)
        .values({ email, reason })
        .onConflictDoUpdate({
          target: emailSuppressions.email,
          set: { reason },
          // A hard bounce or complaint stays; only an unsubscribe can be overwritten.
          setWhere: sql`${emailSuppressions.reason} = 'unsubscribed'`,
        });
    },
  };
}
