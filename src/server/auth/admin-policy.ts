import { env } from "@/env";

/** Operators listed in `ADMIN_EMAILS` (comma-separated, case-insensitive). */
export function adminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether a signed-in user may use /admin. The address must be on the allowlist and
 * verified, so signing up with someone else's address can't grant access.
 */
export function isAdmin(
  user: { email: string; emailVerified: boolean } | null,
  allowlist: string[] = adminEmails(),
): boolean {
  return Boolean(user?.emailVerified && allowlist.includes(user.email.trim().toLowerCase()));
}
