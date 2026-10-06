import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/db";
import { learningPlanMembers, roomBookings, rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { upsertLessonProgress } from "@/lib/learning-plans";
import { revalidatePath } from "next/cache";

const completionSchema = z.object({
  roomId: z.string().uuid(),
  markComplete: z.boolean().default(true),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = completionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid completion payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, parsed.data.roomId)).limit(1);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.sessionType !== "lesson_live" || !room.planId || !room.lessonId) {
    return NextResponse.json({ error: "This session is not linked to a trackable lesson." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(roomBookings)
    .where(and(eq(roomBookings.roomId, room.id), eq(roomBookings.userId, user.id)))
    .limit(1);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const [member] = await db
    .select({ id: learningPlanMembers.id })
    .from(learningPlanMembers)
    .where(and(eq(learningPlanMembers.planId, room.planId), eq(learningPlanMembers.userId, user.id)))
    .limit(1);
  if (!member) return NextResponse.json({ error: "Plan membership not found" }, { status: 404 });

  await db
    .update(roomBookings)
    .set({
      completionMarkedByLearner: parsed.data.markComplete,
      completionMarkedAt: parsed.data.markComplete ? new Date() : null,
    })
    .where(eq(roomBookings.id, booking.id));

  const progress = await upsertLessonProgress({
    planId: room.planId,
    lessonId: room.lessonId,
    actorUserId: user.id,
    planMemberId: member.id,
    status: parsed.data.markComplete ? "completed" : "in_progress",
    notes: parsed.data.markComplete
      ? "Learner manually marked lesson complete after live session."
      : "Learner kept lesson open for follow-up after live session.",
  });

  revalidatePath(`/dashboard/learning/${room.planId}`);
  revalidatePath("/dashboard/learning");

  return NextResponse.json({ progress });
}
