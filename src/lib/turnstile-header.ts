/** Header Better Auth's captcha plugin reads the Turnstile token from (sign-up, password reset). */
export const TURNSTILE_HEADER = "x-captcha-response";

/** Whether a Better Auth error code means the bot check failed or the token was missing. */
export function isBotCheckError(code: string | undefined): boolean {
  return code === "VERIFICATION_FAILED" || code === "MISSING_RESPONSE";
}
