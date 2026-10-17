"use client";

import { createAuthClient } from "better-auth/react";

/** Browser-side auth helpers (sign in, sign up, sign out, password reset). */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
