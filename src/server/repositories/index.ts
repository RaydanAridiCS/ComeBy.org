import "server-only";

import { type Database, type DatabaseOrTransaction, db } from "@/db/client";
import { createActivityRepository } from "./drizzle/activity.repository";
import { createAdminRepository } from "./drizzle/admin.repository";
import { createEventRepository } from "./drizzle/event.repository";
import {
  createEmailSuppressionRepository,
  createPushSubscriptionRepository,
  createRateLimitRepository,
  createReportRepository,
} from "./drizzle/misc.repository";
import { createRsvpRepository } from "./drizzle/rsvp.repository";
import { createUserRepository, createUserSettingsRepository } from "./drizzle/user.repository";
import type { Repositories, TransactionRunner } from "./interfaces";

export type * from "./interfaces";
export type * from "./types";

/** Binds every repository to one connection or transaction. */
export function createRepositories(handle: DatabaseOrTransaction): Repositories {
  return {
    events: createEventRepository(handle),
    rsvps: createRsvpRepository(handle),
    activity: createActivityRepository(handle),
    users: createUserRepository(handle),
    userSettings: createUserSettingsRepository(handle),
    pushSubscriptions: createPushSubscriptionRepository(handle),
    reports: createReportRepository(handle),
    rateLimits: createRateLimitRepository(handle),
    emailSuppressions: createEmailSuppressionRepository(handle),
    admin: createAdminRepository(handle),
  };
}

export function createTransactionRunner(database: Database): TransactionRunner {
  return (work) => database.transaction((tx) => work(createRepositories(tx)));
}

/** Repositories on the shared connection. */
export const repositories: Repositories = createRepositories(db);
export const runInTransaction: TransactionRunner = createTransactionRunner(db);
