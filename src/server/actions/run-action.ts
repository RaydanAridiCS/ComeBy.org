import "server-only";

import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { getServerTranslator } from "@/i18n/config";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/result";
import { AppError, isAppError } from "../errors";

type Translator = ReturnType<typeof getServerTranslator>;

function translateKey(
  t: Translator,
  key: string,
  params?: Record<string, string | number>,
): string {
  // Keys come from our own code (schemas and services), so they always exist in the catalogue.
  return t.has(key as never) ? t(key as never, params as never) : key;
}

function limitMessage(t: Translator, error: AppError): string {
  const limit = String(error.params.limit ?? "default");
  const key = `errors.limits.${limit}`;
  return t.has(key as never)
    ? t(key as never, { max: error.params.max ?? "" } as never)
    : t("errors.limits.default");
}

function zodFieldErrors(t: Translator, error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = translateKey(t, issue.message);
  }
  return fieldErrors;
}

/** Converts any error from a service into a translated, user-safe ActionResult. */
export function toActionError(error: unknown): ActionResult<never> {
  const t = getServerTranslator();
  if (error instanceof ZodError) {
    return {
      ok: false,
      error: {
        code: "validation",
        message: t("errors.validation"),
        fieldErrors: zodFieldErrors(t, error),
      },
    };
  }
  if (isAppError(error)) {
    const message =
      error.code === "limit_reached"
        ? limitMessage(t, error)
        : translateKey(t, `errors.${error.code}`);
    const fieldErrors = Object.fromEntries(
      Object.entries(error.fieldErrors).map(([field, key]) => [field, translateKey(t, key)]),
    );
    return { ok: false, error: { code: error.code, message, fieldErrors } };
  }
  logger.error({ err: error }, "Unexpected error in server action");
  return { ok: false, error: { code: "generic", message: t("errors.generic") } };
}

/**
 * Runs a server action body and converts thrown errors into an ActionResult.
 * Next.js control-flow errors (redirect, notFound) are re-thrown untouched.
 */
export async function runAction<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    unstable_rethrow(error);
    return toActionError(error);
  }
}

export { AppError };
