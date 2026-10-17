/**
 * Domain errors thrown by services. Server actions convert them into friendly,
 * translated messages using `code`; anything else becomes a generic error.
 */
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "limit_reached"
  | "rate_limited"
  | "rsvp_closed"
  | "event_cancelled"
  | "slug_taken"
  | "bot_check_failed"
  | "conflict";

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Extra values for the translated message, e.g. `{ limit: 10 }`. */
  readonly params: Record<string, string | number>;
  /** Field-level problems for forms, keyed by field name. */
  readonly fieldErrors: Record<string, string>;

  constructor(
    code: AppErrorCode,
    options: {
      message?: string;
      params?: Record<string, string | number>;
      fieldErrors?: Record<string, string>;
    } = {},
  ) {
    super(options.message ?? code);
    this.name = "AppError";
    this.code = code;
    this.params = options.params ?? {};
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

/** A free-tier hard limit was reached. `limit` names the key in `LIMITS`. */
export class LimitReachedError extends AppError {
  constructor(limit: string, max: number) {
    super("limit_reached", { message: `Limit reached: ${limit}`, params: { limit, max } });
    this.name = "LimitReachedError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
