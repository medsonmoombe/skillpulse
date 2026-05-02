import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import type { DiscoveryIntent } from "@/lib/discovery-intent";

let discoveryIntentColumnPromise: Promise<boolean> | null = null;

export function hasDiscoveryIntentColumn() {
  if (!discoveryIntentColumnPromise) {
    discoveryIntentColumnPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'user_settings'
            and column_name = 'discovery_intent'
        ) as "exists"
      `)
      .then((result) => {
        const row = result[0];
        return Boolean(row?.exists);
      })
      .catch(() => false);
  }

  return discoveryIntentColumnPromise;
}

export async function ensureUserSettingsRow(userId: string) {
  if (await hasDiscoveryIntentColumn()) {
    await db.insert(userSettings).values({ userId }).onConflictDoNothing();
    return;
  }

  await db.execute(sql`
    insert into "user_settings" ("user_id")
    values (${userId})
    on conflict ("user_id") do nothing
  `);
}

export async function getUserDiscoveryIntent(userId: string): Promise<DiscoveryIntent | null> {
  if (!(await hasDiscoveryIntentColumn())) {
    return null;
  }

  const [settings] = await db
    .select({
      discoveryIntent: userSettings.discoveryIntent,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings?.discoveryIntent ?? null;
}

export async function updateDiscoveryIntentIfAvailable(
  userId: string,
  discoveryIntent: DiscoveryIntent
) {
  if (!(await hasDiscoveryIntentColumn())) {
    return false;
  }

  await db
    .update(userSettings)
    .set({
      discoveryIntent,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId));

  return true;
}

export async function getUserSettingsForPage(userId: string) {
  const supportsDiscoveryIntent = await hasDiscoveryIntentColumn();

  if (supportsDiscoveryIntent) {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    return settings ?? null;
  }

  const result = await db.execute<{
    id: string;
    userId: string;
    allowDirectMessages: boolean;
    directMessagePrivacy: "everyone" | "matches_only" | "nobody";
    allowGroupInvites: boolean;
    showTypingIndicators: boolean;
    showReadReceipts: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    profileVisibility: "public" | "community" | "private";
    searchableProfile: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>(sql`
    select
      "id",
      "user_id" as "userId",
      "allow_direct_messages" as "allowDirectMessages",
      "direct_message_privacy" as "directMessagePrivacy",
      "allow_group_invites" as "allowGroupInvites",
      "show_typing_indicators" as "showTypingIndicators",
      "show_read_receipts" as "showReadReceipts",
      "email_notifications" as "emailNotifications",
      "in_app_notifications" as "inAppNotifications",
      "profile_visibility" as "profileVisibility",
      "searchable_profile" as "searchableProfile",
      "created_at" as "createdAt",
      "updated_at" as "updatedAt"
    from "user_settings"
    where "user_id" = ${userId}
    limit 1
  `);

  const row = result[0];

  if (!row) {
    return null;
  }

  return {
    ...row,
    discoveryIntent: null,
  };
}
