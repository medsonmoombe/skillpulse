import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { expertProfiles } from "@/db/schema";

let expertProfileMediaColumnsPromise: Promise<boolean> | null = null;

export function hasExpertProfileMediaColumns() {
  if (!expertProfileMediaColumnsPromise) {
    expertProfileMediaColumnsPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'expert_profiles'
            and column_name = 'intro_video_url'
        ) as "exists"
      `)
      .then((result) => Boolean(result[0]?.exists))
      .catch(() => false);
  }

  return expertProfileMediaColumnsPromise;
}

export async function getExpertProfileForSettings(userId: string) {
  const supportsMedia = await hasExpertProfileMediaColumns();

  if (supportsMedia) {
    const [profile] = await db
      .select({
        headline: expertProfiles.headline,
        hourlyRateCents: expertProfiles.hourlyRateCents,
        availability: expertProfiles.availability,
        introImageUrl: expertProfiles.introImageUrl,
        introVideoUrl: expertProfiles.introVideoUrl,
      })
      .from(expertProfiles)
      .where(eq(expertProfiles.userId, userId))
      .limit(1);

    return profile ?? null;
  }

  const result = await db.execute<{
    headline: string | null;
    hourlyRateCents: number | null;
    availability: Record<string, string[]> | null;
  }>(sql`
    select
      "headline",
      "hourly_rate_cents" as "hourlyRateCents",
      "availability"
    from "expert_profiles"
    where "user_id" = ${userId}
    limit 1
  `);

  const row = result[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    introImageUrl: null,
    introVideoUrl: null,
  };
}
