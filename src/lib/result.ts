/**
 * The shape every server action returns, so client forms can handle success
 * and failure the same way everywhere.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        /** Already translated, ready to show to the user. */
        message: string;
        fieldErrors?: Record<string, string>;
      };
    };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}
