import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, users, learningPlanMembers, learningPlans, learningPlanLessons } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const liveLessons = await db
    .select({
      roomId: rooms.id,
      planId: rooms.planId,
      planTitle: learningPlans.title,
      lessonTitle: learningPlanLessons.title,
      hostName: users.displayName,
      startsAt: rooms.startsAt,
      status: rooms.status,
    })
    .from(rooms)
    .innerJoin(learningPlans, eq(rooms.planId, learningPlans.id))
    .innerJoin(learningPlanLessons, eq(rooms.lessonId, learningPlanLessons.id))
    .leftJoin(users, eq(rooms.hostId, users.id))
    .leftJoin(learningPlanMembers, and(
      eq(learningPlanMembers.planId, rooms.planId),
      eq(learningPlanMembers.userId, userId)
    ))
    .where(
      and(
        eq(rooms.sessionType, "lesson_live"),
        or(
          eq(rooms.status, "active"),
          eq(rooms.status, "scheduled")
        ),
        or(
          eq(rooms.hostId, userId),
          and(
            eq(learningPlanMembers.userId, userId),
            or(
              eq(learningPlanMembers.status, "invited"),
              eq(learningPlanMembers.status, "active")
            )
          )
        )
      )
    );

  return NextResponse.json({ lessons: liveLessons });
}
