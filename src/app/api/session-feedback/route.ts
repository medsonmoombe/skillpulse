import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/db";
import { expertProfiles, expertReviews, roomBookings, roomSessionFeedback, rooms } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

const feedbackSchema = z.object({
  roomId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).nullable().optional(),
  applyToExpertProfile: z.boolean().default(false),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, parsed.data.roomId)).limit(1);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId === user.id) return NextResponse.json({ error: "Hosts cannot rate their own session." }, { status: 400 });

  const [booking] = await db
    .select({ id: roomBookings.id })
    .from(roomBookings)
    .where(and(eq(roomBookings.roomId, room.id), eq(roomBookings.userId, user.id)))
    .limit(1);
  if (!booking) return NextResponse.json({ error: "Only session participants can leave feedback." }, { status: 403 });

  const [feedback] = await db
    .insert(roomSessionFeedback)
    .values({
      roomId: room.id,
      expertId: room.hostId,
      reviewerId: user.id,
      bookingId: booking.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
      applyToExpertProfile: parsed.data.applyToExpertProfile,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roomSessionFeedback.roomId, roomSessionFeedback.reviewerId],
      set: {
        rating: parsed.data.rating,
        comment: parsed.data.comment?.trim() || null,
        applyToExpertProfile: parsed.data.applyToExpertProfile,
        updatedAt: new Date(),
      },
    })
    .returning();

  await db
    .update(roomBookings)
    .set({ feedbackSubmittedAt: new Date() })
    .where(eq(roomBookings.id, booking.id));

  if (parsed.data.applyToExpertProfile) {
    await db
      .insert(expertReviews)
      .values({
        expertId: room.hostId,
        reviewerId: user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [expertReviews.expertId, expertReviews.reviewerId],
        set: {
          rating: parsed.data.rating,
          comment: parsed.data.comment?.trim() || null,
        },
      });

    const [stats] = await db.execute(sql`
      SELECT
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*) as total
      FROM expert_reviews
      WHERE expert_id = ${room.hostId}
    `);

    const avgRating = parseFloat(String((stats as { avg_rating?: unknown }).avg_rating ?? 0));
    const total = parseInt(String((stats as { total?: unknown }).total ?? 0), 10);
    await db
      .update(expertProfiles)
      .set({ ratingAvg: Math.round(avgRating * 20), reviewCount: total })
      .where(eq(expertProfiles.userId, room.hostId));
  }

  return NextResponse.json({ feedback }, { status: 201 });
}
