import { requireUser } from "@/server/auth/session";
import { UserMenuClient } from "./user-menu-client";

/** Reads the session (request-time) and renders the avatar menu. */
export async function UserMenu() {
  const user = await requireUser("/dashboard");
  return <UserMenuClient name={user.name} email={user.email} image={user.image} />;
}
