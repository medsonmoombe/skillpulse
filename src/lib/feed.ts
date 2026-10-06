import { desc, eq, sql } from "drizzle-orm";
import { db, withRetry } from "@/db";
import { articleInteractions, articles, expertProfiles, topics, userSettings, userTopics, users } from "@/db/schema";
import { discoveryIntentLabels, type DiscoveryIntent } from "@/lib/discovery-intent";
import { getUserDiscoveryIntent } from "@/lib/user-settings-compat";

type UserRole = "learner" | "expert";

export type FeedArticle = {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl: string | null;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  authorRole: UserRole | null;
  topicId: string | null;
  topicName: string | null;
  authorHeadline: string | null;
  authorIntent: DiscoveryIntent | null;
  authorIntentLabel: string | null;
  matchScore: number;
  matchReasons: string[];
  fireCount: number;
  lightbulbCount: number;
  heartCount: number;
  commentCount: number;
};

export async function getFeedArticlesForUser(userId?: string | null, limit = 12): Promise<FeedArticle[]> {
  const fetchLimit = userId ? Math.max(limit * 2, 18) : limit;
  let rawArticles: Array<{
    id: string;
    title: string;
    slug: string;
    content: string;
    coverImageUrl: string | null;
    createdAt: Date;
    authorId: string | null;
    authorName: string | null;
    authorAvatar: string | null;
    authorRole: UserRole | null;
    topicId: string | null;
    topicName: string | null;
    authorHeadline: string | null;
    authorIntent: DiscoveryIntent | null;
  }>;

  try {
    rawArticles = await withRetry(() =>
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          content: articles.content,
          coverImageUrl: articles.coverImageUrl,
          createdAt: articles.createdAt,
          authorId: users.id,
          authorName: users.displayName,
          authorAvatar: users.avatarUrl,
          authorRole: users.role,
          topicId: topics.id,
          topicName: topics.name,
          authorHeadline: expertProfiles.headline,
          authorIntent: userSettings.discoveryIntent,
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .leftJoin(topics, eq(articles.topicId, topics.id))
        .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
        .leftJoin(userSettings, eq(userSettings.userId, users.id))
        .where(eq(articles.published, true))
        .orderBy(desc(articles.createdAt))
        .limit(fetchLimit),
    1);
  } catch (err) {
    console.error("[feed] Failed to load feed articles:", {
      message: (err as Error)?.message,
      userId: userId ?? null,
    });
    return [];
  }

  // Fetch interaction counts for all fetched articles in one query
  const articleIds = rawArticles.map((a) => a.id);
  const interactionCounts = articleIds.length
    ? await withRetry(() =>
        db
          .select({
            articleId: articleInteractions.articleId,
            type: articleInteractions.type,
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(articleInteractions)
          .where(sql`${articleInteractions.articleId} = ANY(ARRAY[${sql.join(articleIds.map((id) => sql`${id}::uuid`), sql`, `)}])`)
          .groupBy(articleInteractions.articleId, articleInteractions.type)
      ).catch((err) => {
        console.error("[feed] Failed to load interaction counts:", (err as Error)?.message);
        return [];
      })
    : [];

  const countsMap = new Map<string, { fire: number; lightbulb: number; heart: number; comment: number }>();
  for (const row of interactionCounts) {
    if (!countsMap.has(row.articleId)) {
      countsMap.set(row.articleId, { fire: 0, lightbulb: 0, heart: 0, comment: 0 });
    }
    const entry = countsMap.get(row.articleId)!;
    if (row.type === "fire") entry.fire = row.count;
    else if (row.type === "lightbulb") entry.lightbulb = row.count;
    else if (row.type === "heart") entry.heart = row.count;
    else if (row.type === "comment") entry.comment = row.count;
  }

  if (!userId) {
    return rawArticles.slice(0, limit).map((article) => {
      const c = countsMap.get(article.id) ?? { fire: 0, lightbulb: 0, heart: 0, comment: 0 };
      return {
        ...article,
        authorIntentLabel: article.authorIntent ? discoveryIntentLabels[article.authorIntent] : null,
        matchScore: 0,
        matchReasons: [],
        fireCount: c.fire,
        lightbulbCount: c.lightbulb,
        heartCount: c.heart,
        commentCount: c.comment,
      };
    });
  }

  const [viewerSettings, viewerTopics] = await Promise.all([
    getUserDiscoveryIntent(userId).catch((err) => {
      console.error("[feed] Failed to load viewer discovery intent:", (err as Error)?.message);
      return null;
    }),
    withRetry(() =>
      db
        .select({
          topicId: userTopics.topicId,
        })
        .from(userTopics)
        .where(eq(userTopics.userId, userId))
    ).catch((err) => {
      console.error("[feed] Failed to load viewer topics:", (err as Error)?.message);
      return [];
    }),
  ]);

  const viewerTopicIds = new Set(viewerTopics.map((topic) => topic.topicId));
  const viewerIntent = viewerSettings ?? null;

  return rawArticles
    .map((article) => scoreFeedArticle(article, viewerTopicIds, viewerIntent, countsMap))
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .slice(0, limit);
}

function scoreFeedArticle(
  article: Omit<FeedArticle, "authorIntentLabel" | "matchScore" | "matchReasons" | "fireCount" | "lightbulbCount" | "heartCount" | "commentCount">,
  viewerTopicIds: Set<string>,
  viewerIntent: DiscoveryIntent | null,
  countsMap: Map<string, { fire: number; lightbulb: number; heart: number; comment: number }>
): FeedArticle {
  let matchScore = 0;
  const matchReasons: string[] = [];

  if (article.topicId && viewerTopicIds.has(article.topicId)) {
    matchScore += 5;
    matchReasons.push("Topic you follow");
  }

  if (article.authorRole === "expert") {
    matchScore += 2;
    matchReasons.push("Published by an expert");
  }

  if (viewerIntent && article.authorIntent === viewerIntent) {
    matchScore += 3;
    matchReasons.push(`Intent fit: ${discoveryIntentLabels[viewerIntent]}`);
  }

  if (article.authorHeadline) {
    matchScore += 1;
  }

  const c = countsMap.get(article.id) ?? { fire: 0, lightbulb: 0, heart: 0, comment: 0 };

  return {
    ...article,
    authorIntentLabel: article.authorIntent ? discoveryIntentLabels[article.authorIntent] : null,
    matchScore,
    matchReasons,
    fireCount: c.fire,
    lightbulbCount: c.lightbulb,
    heartCount: c.heart,
    commentCount: c.comment,
  };
}
