import "server-only";

import { notFound } from "next/navigation";
import { isAdmin } from "./admin-policy";
import { type CurrentUser, getCurrentUser } from "./session";

/** The signed-in admin. Everyone else gets the 404 page, so /admin looks like it doesn't exist. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
