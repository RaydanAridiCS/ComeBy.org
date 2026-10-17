import type { JobQueue } from "../jobs/types";
import type { Repositories, TransactionRunner } from "../repositories/interfaces";

/** Everything a service needs from the outside world. Real wiring lives in ./index.ts. */
export type ServiceDeps = {
  repos: Repositories;
  transaction: TransactionRunner;
  jobs: JobQueue;
  /** Current time. Injected so tests can control it. */
  now: () => Date;
};

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
