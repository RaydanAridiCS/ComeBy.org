import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { LIMITS } from "@/config/limits";
import { SITE } from "@/config/site";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { resetPassword, verifyEmail } from "@/emails/templates";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { getFileStorage } from "../adapters/storage";
import { jobQueue } from "../jobs/queue";
import { repositories } from "../repositories";
import { hmac } from "../security/crypto";
import { clientIpFrom } from "../security/request-info";
import { DAY_MS } from "../services/deps";
import { queueEmail } from "../services/email.service";

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/**
 * Host accounts (guests never need one). Email + password with verified emails,
 * plus optional "Sign in with Google". Sessions live in our own Postgres.
 */
export const auth = betterAuth({
  appName: SITE.name,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await queueEmail(jobQueue, user.email, resetPassword({ url }));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await queueEmail(jobQueue, user.email, verifyEmail({ name: user.name, url }));
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    deleteUser: {
      enabled: true,
      // Clean up uploaded cover images; database rows cascade automatically.
      beforeDelete: async (user) => {
        const events = await repositories.events.listByHostWithStats(user.id);
        const storage = await getFileStorage();
        await Promise.all(
          events
            .map((event) => event.coverImageKey)
            .filter((key): key is string => Boolean(key))
            .map((key) => storage.delete(key).catch(() => undefined)),
        );
        logger.info({ userId: user.id, events: events.length }, "Deleting account");
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
  hooks: {
    // Free-tier limit: at most N new accounts from the same network per day.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const ip = ctx.headers ? clientIpFrom(ctx.headers) : "unknown";
      const hits = await repositories.rateLimits.hit(
        `signup:${hmac(`net:${ip}`)}`,
        DAY_MS,
        new Date(),
      );
      if (hits > LIMITS.signupsPerNetworkPerDay) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many sign-ups from this network today",
          code: "TOO_MANY_SIGNUPS",
        });
      }
    }),
  },
  advanced: {
    useSecureCookies: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
  },
  telemetry: { enabled: false },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
