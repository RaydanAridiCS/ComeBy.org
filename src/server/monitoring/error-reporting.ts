import "server-only";

import { randomUUID } from "node:crypto";
import { env } from "@/env";
import { logger } from "@/lib/logger";

/*
 * Error reporting for any Sentry-compatible server: Sentry itself or self-hosted
 * GlitchTip. It talks to the plain "store" HTTP endpoint, so there is no SDK to
 * install. Reporting is off unless `ERROR_REPORTING_DSN` is set.
 *
 * Privacy: events carry only the error, a scrubbed message, the route pattern and
 * a few tags. Never request bodies, headers, cookies, query strings or user data.
 */

export type ErrorSource = "server" | "client" | "job";

export type ErrorContext = {
  source: ErrorSource;
  /** Route pattern such as `/[slug]`, never a real URL (links like `/r/<secret>` are credentials). */
  route?: string;
  method?: string;
  /** Job name for failed background jobs. */
  job?: string;
  /** Next.js error digest, to match a client report with the server log. */
  digest?: string;
};

export type Dsn = { endpoint: string; publicKey: string };

/** Parses `https://<publicKey>@host/<projectId>` into the store endpoint and key. */
export function parseDsn(dsn: string): Dsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!url.username || !projectId) return null;
    const prefix = url.pathname.split("/").filter(Boolean).slice(0, -1).join("/");
    const base = `${url.protocol}//${url.host}${prefix ? `/${prefix}` : ""}`;
    return { endpoint: `${base}/api/${projectId}/store/`, publicKey: url.username };
  } catch {
    return null;
  }
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;
const SECRET_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;

/** Removes emails, phone numbers and long token-like strings from free text. */
export function scrubText(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[email]")
    .replace(SECRET_PATTERN, "[token]")
    .replace(PHONE_PATTERN, "[phone]")
    .slice(0, 2000);
}

type StackFrame = { filename: string; function: string; lineno?: number; colno?: number };

/** Turns a V8 stack trace into the frame list Sentry-style servers expect (oldest first). */
export function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split("\n")) {
    const match = line.match(/^\s*at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?$/);
    if (!match) continue;
    frames.push({
      function: match[1] ?? "<anonymous>",
      filename: scrubText(match[2] ?? ""),
      lineno: Number(match[3]),
      colno: Number(match[4]),
    });
  }
  return frames.reverse();
}

export type ReportableError = { name?: string; message?: string; stack?: string };

export function toReportable(error: unknown): ReportableError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  // Browser errors arrive as plain objects from /api/client-error.
  if (typeof error === "object" && error !== null && "message" in error) {
    const { name, message, stack } = error as Record<string, unknown>;
    return {
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof message === "string" ? { message } : {}),
      ...(typeof stack === "string" ? { stack } : {}),
    };
  }
  return {
    name: "NonError",
    message: typeof error === "string" ? error : "Non-error value thrown",
  };
}

/** Builds the JSON event. Pure, so it can be unit-tested. */
export function buildEvent(
  error: ReportableError,
  context: ErrorContext,
  meta: { environment: string; now: Date; eventId?: string },
) {
  return {
    event_id: (meta.eventId ?? randomUUID()).replaceAll("-", ""),
    timestamp: meta.now.toISOString(),
    platform: context.source === "client" ? "javascript" : "node",
    level: "error",
    logger: `comeby.${context.source}`,
    environment: meta.environment,
    server_name: "comeby",
    transaction: context.route,
    exception: {
      values: [
        {
          type: scrubText(error.name ?? "Error"),
          value: scrubText(error.message ?? ""),
          stacktrace: { frames: parseStack(error.stack) },
        },
      ],
    },
    tags: {
      source: context.source,
      ...(context.method ? { method: context.method } : {}),
      ...(context.job ? { job: context.job } : {}),
      ...(context.digest ? { digest: context.digest } : {}),
    },
    // Fingerprint by type + route so one bad deploy is one issue, not thousands.
    fingerprint: [error.name ?? "Error", context.route ?? context.job ?? "unknown"],
  };
}

/** Allows at most `MAX_PER_MINUTE` outgoing reports so an error loop can't flood the server. */
const MAX_PER_MINUTE = 30;
let windowStart = 0;
let sentInWindow = 0;

function allowSend(nowMs: number): boolean {
  if (nowMs - windowStart > 60_000) {
    windowStart = nowMs;
    sentInWindow = 0;
  }
  sentInWindow += 1;
  return sentInWindow <= MAX_PER_MINUTE;
}

export function isErrorReportingEnabled(): boolean {
  return Boolean(env.ERROR_REPORTING_DSN && parseDsn(env.ERROR_REPORTING_DSN));
}

/** Sends one error to the configured server. Never throws and never blocks the caller. */
export async function reportError(error: unknown, context: ErrorContext): Promise<void> {
  if (!env.ERROR_REPORTING_DSN) return;
  const dsn = parseDsn(env.ERROR_REPORTING_DSN);
  if (!dsn) return;
  const now = new Date();
  if (!allowSend(now.getTime())) return;
  try {
    const event = buildEvent(toReportable(error), context, {
      environment: env.NODE_ENV,
      now,
    });
    const response = await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_client=comeby/1.0, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) logger.warn({ status: response.status }, "Error report was rejected");
  } catch (reportingError) {
    logger.warn({ err: reportingError }, "Could not send error report");
  }
}
