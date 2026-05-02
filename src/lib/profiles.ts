import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, expertProfiles, topics, userSettings, userTopics, users } from "@/db/schema";
import { hasExpertProfileMediaColumns } from "@/lib/expert-profile-compat";
import { hasDiscoveryIntentColumn } from "@/lib/user-settings-compat";

export async function getDiscoverableProfile(targetUserId: string, viewerUserId?: string | null) {
  const supportsDiscoveryIntent = await hasDiscoveryIntentColumn();
  const supportsProfileMedia = await hasExpertProfileMediaColumns();
  const [profile] = supportsDiscoveryIntent && supportsProfileMedia
    ? await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          role: users.role,
          headline: expertProfiles.headline,
          introImageUrl: expertProfiles.introImageUrl,
          introVideoUrl: expertProfiles.introVideoUrl,
          availability: expertProfiles.availability,
          verificationStatus: expertProfiles.verificationStatus,
          ratingAvg: expertProfiles.ratingAvg,
          reviewCount: expertProfiles.reviewCount,
          profileVisibility: userSettings.profileVisibility,
          searchableProfile: userSettings.searchableProfile,
          discoveryIntent: userSettings.discoveryIntent,
        })
        .from(users)
        .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
        .leftJoin(userSettings, eq(userSettings.userId, users.id))
        .where(eq(users.id, targetUserId))
        .limit(1)
    : supportsDiscoveryIntent
      ? await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          role: users.role,
          headline: expertProfiles.headline,
          introImageUrl: sql<string | null>`null`,
          introVideoUrl: sql<string | null>`null`,
          availability: expertProfiles.availability,
          verificationStatus: expertProfiles.verificationStatus,
          ratingAvg: expertProfiles.ratingAvg,
          reviewCount: expertProfiles.reviewCount,
          profileVisibility: userSettings.profileVisibility,
          searchableProfile: userSettings.searchableProfile,
          discoveryIntent: userSettings.discoveryIntent,
        })
        .from(users)
        .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
        .leftJoin(userSettings, eq(userSettings.userId, users.id))
        .where(eq(users.id, targetUserId))
        .limit(1)
      : supportsProfileMedia
        ? await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          role: users.role,
          headline: expertProfiles.headline,
          introImageUrl: expertProfiles.introImageUrl,
          introVideoUrl: expertProfiles.introVideoUrl,
          availability: expertProfiles.availability,
          verificationStatus: expertProfiles.verificationStatus,
          ratingAvg: expertProfiles.ratingAvg,
          reviewCount: expertProfiles.reviewCount,
          profileVisibility: userSettings.profileVisibility,
          searchableProfile: userSettings.searchableProfile,
          discoveryIntent: sql<null>`null`,
        })
        .from(users)
        .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
        .leftJoin(userSettings, eq(userSettings.userId, users.id))
        .where(eq(users.id, targetUserId))
        .limit(1)
      : await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          role: users.role,
          headline: expertProfiles.headline,
          introImageUrl: sql<string | null>`null`,
          introVideoUrl: sql<string | null>`null`,
          availability: expertProfiles.availability,
          verificationStatus: expertProfiles.verificationStatus,
          ratingAvg: expertProfiles.ratingAvg,
          reviewCount: expertProfiles.reviewCount,
          profileVisibility: userSettings.profileVisibility,
          searchableProfile: userSettings.searchableProfile,
          discoveryIntent: sql<null>`null`,
        })
        .from(users)
        .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
        .leftJoin(userSettings, eq(userSettings.userId, users.id))
        .where(eq(users.id, targetUserId))
        .limit(1);

  if (!profile) {
    return null;
  }

  const isOwner = viewerUserId === profile.id;
  const visibility = profile.profileVisibility ?? "community";

  if (!isOwner) {
    if (profile.searchableProfile === false) {
      return null;
    }

    if (visibility === "private") {
      return null;
    }

    if (visibility === "community" && !viewerUserId) {
      return null;
    }
  }

  const [topicRows, publishedArticles] = await Promise.all([
    db
      .select({
        topicId: topics.id,
        topicName: topics.name,
        relationship: userTopics.relationship,
      })
      .from(userTopics)
      .innerJoin(topics, eq(topics.id, userTopics.topicId))
      .where(eq(userTopics.userId, profile.id))
      .orderBy(asc(topics.name)),
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(and(eq(articles.authorId, profile.id), eq(articles.published, true)))
      .orderBy(desc(articles.createdAt))
      .limit(6),
  ]);

  return {
    ...profile,
    topics: topicRows,
    articles: publishedArticles,
  };
}
