# Background jobs

Anything that shouldn't make a person wait (sending email, push notifications) or that happens on a schedule (reminders, the daily digest, clean-up) runs as a background job. Jobs are stored in PostgreSQL by [pg-boss](https://github.com/timgit/pg-boss), in the `pgboss` schema, so there is no Redis or separate queue service ([ADR 0003](adr/0003-postgres-for-everything.md)).

## Where the code is

| File | What it holds |
|---|---|
| `src/server/jobs/types.ts` | Every job name and the data it carries (`JobPayloads`), plus the `JobQueue` interface services use |
| `src/server/jobs/queue.ts` | Starts pg-boss, creates the queues, and implements `jobQueue.enqueue` |
| `src/server/jobs/worker.ts` | Maps each job to its handler, registers the workers and the schedules |
| `src/server/services/notification.service.ts` | The handlers themselves |
| `src/instrumentation.ts` | Starts the workers when the server starts, right after migrations |

Workers run **inside the web server process**. There is no separate worker to deploy.

## The jobs

Queued when something happens:

| Job | Queued when | What it does |
|---|---|---|
| `email.send` | Any email is sent | Checks the suppression list, then hands the already-rendered email to the provider |
| `host.rsvp-alert` | A guest responds, or changes their answer | Push notification and, if the host is on "instant", an email. After 50 alert emails in a day the host gets the daily digest instead |
| `guests.event-update` | A host changes the time, place or details in a way guests should notice, or cancels | Emails every guest who left an email |
| `guests.nudge` | A host sends the one-time nudge | Emails guests who answered "maybe" and the addresses the host pasted, then records it in the timeline |
| `moderation.event-hidden` | An event is hidden automatically after 3 reports | Emails every operator in `ADMIN_EMAILS` |

Run on a schedule (cron, UTC):

| Job | Schedule | What it does |
|---|---|---|
| `guests.reminders-due` | Every 15 minutes | Sends the one reminder to going and maybe guests of events starting in the next 24 hours ([ADR 0011](adr/0011-reminders-by-sweep.md)). Looks at up to 200 events per run |
| `hosts.daily-digest` | 18:00 every day | Summary email for hosts on "daily" mode, and for hosts who went over the instant-email quota |
| `privacy.purge-guest-data` | 03:30 every day | Deletes guests' phone numbers and emails, and pasted invitee addresses, for events that ended more than 90 days ago ([privacy-and-data.md](privacy-and-data.md)) |
| `maintenance.cleanup-rate-limits` | 15 minutes past every hour | Deletes expired rate-limit counters |

## Retries and retention

- Every queue is created with `retryLimit: 3`, `retryDelay: 30` seconds and exponential backoff. A job whose handler throws is retried up to three times.
- A failed job is logged and sent to error reporting with its job name (never its data).
- Finished `email.send` jobs are deleted after 24 hours, because they carry the recipient's address and the message. Other jobs follow pg-boss's default retention.
- Handlers are written to be safe to run twice. Reminders and the nudge claim their recipients in the database before queueing email, so a retry or an overlapping run cannot send a second copy.

## Running without workers

`JOBS_ENABLED=false` runs each job inline, inside the request that queued it, instead of storing it. This is for debugging only:

- Requests become slower, and a failing email fails the request.
- **Scheduled jobs never run**, so there are no reminders, no daily digest and no data purge.

`SKIP_STARTUP_TASKS=1` skips both migrations and workers at startup. The Docker build uses it; a running server should not.

## Adding a job

1. Add its name and payload type to `JobPayloads` and to `JOB_NAMES` in `src/server/jobs/types.ts`.
2. Write the handler in a service (most live in `notification.service.ts`).
3. Add a `case` for it in `runJob` and its name to `WORKER_NAMES` in `src/server/jobs/worker.ts`. For a recurring job, also add it to `SCHEDULES`.
4. Queue it from a service with `jobs.enqueue("your.job", payload)`. Services receive `jobs` as a dependency, so unit tests can assert on what was queued using the fake queue in `tests/unit/support/fakes.ts`.
5. If the job sends email, queue each email with `queueEmail` and pick the right category (see [email.md](email.md)).

Keep payloads small and free of personal data where possible: pass ids and load the rows in the handler.

## Testing jobs

- **Unit tests** call the handler directly with fake repositories and a fake clock (`tests/unit/notification.service.test.ts`, `tests/unit/reminders.test.ts`).
- **Integration tests** run the real queries against PostgreSQL (`tests/integration/reminders.test.ts`).
- **End-to-end tests** cover jobs that a click triggers (confirmation emails, update emails, the nudge) by reading the result from Mailpit.
- Scheduled jobs cannot be triggered from a browser. To watch one run against a live server, send the job by hand with pg-boss while the server is running, pointed at a throwaway database. See [testing.md](testing.md).

## Limits of the current design

- One app instance only. Two instances would both run workers, which pg-boss handles, but nothing else in the app is ready for it (see [deployment.md](deployment.md#run-one-instance)).
- `/api/health` checks the database, not the workers. A worker that failed to start shows up in the logs ("Startup failed") and as missing emails, not as a failed health check.
- A job cannot be cancelled or replaced once queued; `JobQueue` only enqueues. This is why reminders use a sweep rather than one delayed job per event.
