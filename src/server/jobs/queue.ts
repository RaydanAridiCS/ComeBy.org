import "server-only";

import { PgBoss } from "pg-boss";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { JOB_NAMES, type JobName, type JobPayloads, type JobQueue } from "./types";

const globalForBoss = globalThis as unknown as { comebyBoss?: Promise<PgBoss> };

/** Starts (once per process) the pg-boss instance that stores jobs in Postgres. */
export function getBoss(): Promise<PgBoss> {
  globalForBoss.comebyBoss ??= (async () => {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss", max: 4 });
    boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));
    await boss.start();
    for (const name of JOB_NAMES) {
      await boss.createQueue(name, { retryLimit: 3, retryDelay: 30, retryBackoff: true });
    }
    return boss;
  })();
  return globalForBoss.comebyBoss;
}

type InlineHandler = <K extends JobName>(name: K, data: JobPayloads[K]) => Promise<void>;
let inlineHandler: InlineHandler | undefined;

/**
 * When `JOBS_ENABLED=false`, jobs run immediately in the request instead of being queued.
 * Handy for debugging; the worker registers the handler at startup.
 */
export function setInlineJobHandler(handler: InlineHandler): void {
  inlineHandler = handler;
}

export const jobQueue: JobQueue = {
  async enqueue(name, data, options = {}) {
    if (!env.JOBS_ENABLED) {
      if (inlineHandler) await inlineHandler(name, data);
      else logger.warn({ job: name }, "Jobs disabled and no inline handler; job dropped");
      return;
    }
    const boss = await getBoss();
    await boss.send(name, data, {
      ...(options.startAfterSeconds ? { startAfter: options.startAfterSeconds } : {}),
      ...(options.singletonKey ? { singletonKey: options.singletonKey } : {}),
    });
  },
};
