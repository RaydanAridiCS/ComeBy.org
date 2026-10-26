import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
};

/**
 * The signed-in host, or null. Reads the request, so call it inside a <Suspense>
 * boundary (Cache Components). Deduplicated per request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, emailVerified, image } = session.user;
  return { id, name, email, emailVerified, image: image ?? null };
});

/** Like `getCurrentUser`, but sends visitors to the sign-in page. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}
