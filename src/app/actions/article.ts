"use server";

import { db } from "@/db";
import { articles, articleInteractions } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NotificationService } from "@/services/notification-service";

export async function createArticle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const topicId = formData.get("topicId") as string;
  const coverImageUrl = formData.get("coverImageUrl") as string;
  const isPublished = formData.get("isPublished") === "on";

  if (!title || !content) throw new Error("Title and content are required");

  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  const [newArticle] = await db
    .insert(articles)
    .values({
      authorId: user.id,
      title,
      slug: uniqueSlug,
      content,
      topicId: topicId || null,
      coverImageUrl: coverImageUrl || null,
      published: isPublished,
    })
    .returning();

  redirect(`/article/${newArticle.slug}`);
}

export async function updateArticle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const articleId = formData.get("articleId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const topicId = formData.get("topicId") as string;
  const coverImageUrl = formData.get("coverImageUrl") as string;
  const isPublished = formData.get("isPublished") === "on";

  if (!title || !content) throw new Error("Title and content are required");

  const [updated] = await db
    .update(articles)
    .set({
      title,
      content,
      topicId: topicId || null,
      coverImageUrl: coverImageUrl || null,
      published: isPublished,
      updatedAt: new Date(),
    })
    .where(and(eq(articles.id, articleId), eq(articles.authorId, user.id)))
    .returning();

  if (!updated) throw new Error("Article not found or unauthorized");

  revalidatePath(`/article/${updated.slug}`);
  revalidatePath("/dashboard");
  redirect(`/article/${updated.slug}`);
}

export async function deleteArticle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const articleId = formData.get("articleId") as string;
  await db.delete(articles).where(and(eq(articles.id, articleId), eq(articles.authorId, user.id)));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function toggleInteraction(
  articleId: string,
  type: "fire" | "lightbulb" | "heart",
  slug: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db
    .select()
    .from(articleInteractions)
    .where(
      and(
        eq(articleInteractions.articleId, articleId),
        eq(articleInteractions.userId, user.id),
        eq(articleInteractions.type, type)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(articleInteractions)
      .where(eq(articleInteractions.id, existing[0].id));
  } else {
    await db.insert(articleInteractions).values({
      articleId,
      userId: user.id,
      type,
    });

    // Notify the author — skip if the reactor is the author
    const [article] = await db
      .select({ authorId: articles.authorId, title: articles.title })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (article && article.authorId && article.authorId !== user.id) {
      const emojiMap = { fire: "🔥", lightbulb: "💡", heart: "❤️" } as const;
      await NotificationService.createIfNotRecent({
        userId: article.authorId,
        title: `${user.displayName} reacted ${emojiMap[type]} to your article`,
        message: article.title,
        type: "system",
        entityType: "article",
        entityId: articleId,
        actionUrl: `/article/${slug}`,
        dedupeHours: 1,
      });
    }
  }

  revalidatePath(`/article/${slug}`);
}

export async function addComment(
  articleId: string,
  content: string,
  slug: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!content.trim()) throw new Error("Comment cannot be empty");

  await db.insert(articleInteractions).values({
    articleId,
    userId: user.id,
    type: "comment",
    content: content.trim(),
  });

  // Notify the author — skip if the commenter is the author
  const [article] = await db
    .select({ authorId: articles.authorId, title: articles.title })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (article && article.authorId && article.authorId !== user.id) {
    await NotificationService.create({
      userId: article.authorId,
      title: `${user.displayName} commented on your article`,
      message: `"${content.trim().slice(0, 100)}${content.trim().length > 100 ? "…" : ""}"`,
      type: "system",
      entityType: "article",
      entityId: articleId,
      actionUrl: `/article/${slug}`,
    });
  }

  revalidatePath(`/article/${slug}`);
}