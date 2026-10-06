import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import type { DiscoveryIntent } from "@/lib/discovery-intent";

// The discovery_intent column has been stable since migration 0005.
// The old introspection guard (hasDiscoveryIntentColumn) is removed —
// it was a migration-window shim that caused stale-cache 500s.

export async function ensureUserSettingsRow(userId: string) {
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();
}

export async function getUserDiscoveryIntent(userId: string): Promise<DiscoveryIntent | null> {
  const [row] = await db
    .select({ discoveryIntent: userSettings.discoveryIntent })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.discoveryIntent ?? null;
}

export async function updateDiscoveryIntentIfAvailable(
  userId: string,
  discoveryIntent: DiscoveryIntent
) {
  await db
    .update(userSettings)
    .set({ discoveryIntent, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId));
  return true;
}

export async function getUserSettingsForPage(userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return settings ?? null;
}

// Keep for any callers that haven't been updated yet — always returns true now
export async function hasDiscoveryIntentColumn(): Promise<boolean> {
  return true;
}
