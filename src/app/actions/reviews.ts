"use server";

import { db } from "@/db";
import { expertProfiles, expertReviews, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ReviewState } from "./reviews-types";

export async function submitExpertReview(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized" };

  const expertId = formData.get("expertId") as string;
  const rating = parseInt(formData.get("rating") as string, 10);
  const comment = (formData.get("comment") as string)?.trim() || null;

  if (!expertId || isNaN(rating) || rating < 1 || rating > 5) {
    return { success: false, message: "Please select a rating between 1 and 5." };
  }

  if (user.id === expertId) {
    return { success: false, message: "You cannot review yourself." };
  }

  // Upsert — one review per user per expert (enforced by unique constraint)
  await db
    .insert(expertReviews)
    .values({ expertId, reviewerId: user.id, rating, comment })
    .onConflictDoUpdate({
      target: [expertReviews.expertId, expertReviews.reviewerId],
      set: { rating, comment },
    });

  // Recalculate avg and count directly in DB for accuracy
  const [stats] = await db.execute(sql`
    SELECT
      ROUND(AVG(rating)::numeric, 2) as avg_rating,
      COUNT(*) as total
    FROM expert_reviews
    WHERE expert_id = ${expertId}
  `);

  const avgRating = parseFloat(String((stats as any).avg_rating ?? 0));
  const total = parseInt(String((stats as any).total ?? 0), 10);
  // Store as 0-100 (multiply by 20 so 5.0 = 100)
  const ratingAvg = Math.round(avgRating * 20);

  await db
    .update(expertProfiles)
    .set({ ratingAvg, reviewCount: total })
    .where(eq(expertProfiles.userId, expertId));

  revalidatePath(`/profile/${expertId}`);

  return { success: true, message: "Review submitted. Thank you!" };
}

export async function getExpertReviews(expertId: string) {
  return db
    .select({
      id: expertReviews.id,
      rating: expertReviews.rating,
      comment: expertReviews.comment,
      createdAt: expertReviews.createdAt,
      reviewerId: expertReviews.reviewerId,
      reviewerName: users.displayName,
      reviewerAvatar: users.avatarUrl,
    })
    .from(expertReviews)
    .leftJoin(users, eq(expertReviews.reviewerId, users.id))
    .where(eq(expertReviews.expertId, expertId))
    .orderBy(expertReviews.createdAt);
}

export async function getUserReviewForExpert(expertId: string, reviewerId: string) {
  const [existing] = await db
    .select({ id: expertReviews.id, rating: expertReviews.rating, comment: expertReviews.comment })
    .from(expertReviews)
    .where(and(eq(expertReviews.expertId, expertId), eq(expertReviews.reviewerId, reviewerId)));
  return existing ?? null;
}
