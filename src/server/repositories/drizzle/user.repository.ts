import { and, eq, gte, inArray } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@/db/client";
import { eventActivity, events, user, userSettings } from "@/db/schema";
import type { UserRepository, UserSettingsRepository } from "../interfaces";
import type { UserSettingsRecord } from "../types";

export function createUserRepository(db: DatabaseOrTransaction): UserRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      return row ?? null;
    },

    async listIdsWithRsvpActivitySince(since) {
      const rows = await db
        .selectDistinct({ hostId: events.hostId })
        .from(eventActivity)
        .innerJoin(events, eq(events.id, eventActivity.eventId))
        .where(
          and(
            gte(eventActivity.createdAt, since),
            inArray(eventActivity.type, ["rsvp_created", "rsvp_updated"]),
          ),
        );
      return rows.map((row) => row.hostId);
    },
  };
}

function defaultSettings(userId: string): UserSettingsRecord {
  const now = new Date();
  return { userId, emailAlerts: "instant", pushAlerts: true, createdAt: now, updatedAt: now };
}

export function createUserSettingsRepository(db: DatabaseOrTransaction): UserSettingsRepository {
  return {
    async get(userId) {
      const [row] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      return row ?? defaultSettings(userId);
    },

    async upsert(userId, patch) {
      const [row] = await db
        .insert(userSettings)
        .values({ userId, ...patch })
        .onConflictDoUpdate({ target: userSettings.userId, set: patch })
        .returning();
      if (!row) throw new Error("Settings upsert returned no row");
      return row;
    },
  };
}
