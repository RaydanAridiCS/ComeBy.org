import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { newEventDefaults } from "@/features/events/form-values";
import { eventFormSchema } from "@/features/events/schema";
import type { JobName, JobPayloads, JobQueue } from "@/server/jobs/types";
import { createRepositories, createTransactionRunner } from "@/server/repositories";
import type { EventRecord, NewEventRecord } from "@/server/repositories/types";
import type { ServiceDeps } from "@/server/services/deps";

export { db };

/** The real repositories on the test database. */
export const repos = createRepositories(db);

/** Real repositories and transactions; only the job queue is a recorder and the clock is settable. */
export function createIntegrationDeps(start = new Date()) {
  let current = start;
  const jobs: { name: JobName; data: unknown }[] = [];
  const queue: JobQueue = {
    enqueue: async <K extends JobName>(name: K, data: JobPayloads[K]) => {
      jobs.push({ name, data });
    },
  };
  const deps: ServiceDeps = {
    repos,
    transaction: createTransactionRunner(db),
    jobs: queue,
    now: () => current,
  };
  return {
    deps,
    jobs,
    setNow: (date: Date) => {
      current = date;
    },
  };
}

/** Empties every table between tests. */
export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`TRUNCATE "user", events, rsvps, event_activity, push_subscriptions, reports, rate_limits, email_suppressions, admin_audit_log, user_settings CASCADE`,
  );
}

let counter = 0;

export async function createHost(overrides: { email?: string; name?: string } = {}) {
  counter += 1;
  const id = `host-${counter}-${Math.random().toString(36).slice(2, 8)}`;
  const email = overrides.email ?? `${id}@example.com`;
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified) VALUES (${id}, ${overrides.name ?? "Lina"}, ${email}, true)`,
  );
  return { id, email, name: overrides.name ?? "Lina" };
}

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export async function createEvent(
  hostId: string,
  overrides: Partial<NewEventRecord> = {},
): Promise<EventRecord> {
  counter += 1;
  return repos.events.create({
    hostId,
    slug: `event-${counter}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Picnic",
    hostName: "Lina",
    startsAt: inDays(3),
    timezone: "UTC",
    ...overrides,
  });
}

/** Valid event form values, for exercising the event service end to end. */
export function eventFormValues(overrides: Record<string, unknown> = {}) {
  return eventFormSchema.parse({
    ...newEventDefaults("Lina"),
    title: "Picnic",
    startsAt: "2030-01-10T16:00",
    timezone: "UTC",
    ...overrides,
  });
}
