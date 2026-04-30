"use server";

import { db } from "@/db";
import { articles } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";

export async function createArticle(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const topicId = formData.get("topicId") as string;
  const isPublished = formData.get("isPublished") === "on"; // Checkbox value

  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  // Generate a URL-friendly slug (e.g., "My First Post" -> "my-first-post-abc123")
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  // Insert into database
  const [newArticle] = await db
    .insert(articles)
    .values({
      authorId: user.id,
      title,
      slug: uniqueSlug,
      content,
      topicId: topicId || null,
      published: isPublished,
    })
    .returning();

  // Redirect to the newly created article page
  redirect(`/article/${newArticle.slug}`);
}