import { NextResponse } from "next/server";
import { and, eq, isNull, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import { learningPlanLessons, learningPlans } from "@/db/schema";
import {
  LESSON_REMINDER_FIVE_MINUTES,
  LESSON_REMINDER_THIRTY_MINUTES,
  sendLessonReminderNotifications,
} from "@/lib/lesson-live";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyWindowEnd = new Date(now.getTime() + LESSON_REMINDER_THIRTY_MINUTES * 60 * 1000);
  const fiveWindowEnd = new Date(now.getTime() + LESSON_REMINDER_FIVE_MINUTES * 60 * 1000);

  const [thirtyMinuteLessons, fiveMinuteLessons] = await Promise.all([
    db
      .select({
        lessonId: learningPlanLessons.id,
        planId: learningPlanLessons.planId,
        lessonTitle: learningPlanLessons.title,
        scheduledAt: learningPlanLessons.scheduledAt,
        planTitle: learningPlans.title,
        expertId: learningPlans.expertId,
      })
      .from(learningPlanLessons)
      .innerJoin(learningPlans, eq(learningPlanLessons.planId, learningPlans.id))
      .where(
        and(
          isNull(learningPlanLessons.reminderThirtySentAt),
          gte(learningPlanLessons.scheduledAt, now),
          lte(learningPlanLessons.scheduledAt, thirtyWindowEnd)
        )
      ),
    db
      .select({
        lessonId: learningPlanLessons.id,
        planId: learningPlanLessons.planId,
        lessonTitle: learningPlanLessons.title,
        scheduledAt: learningPlanLessons.scheduledAt,
        planTitle: learningPlans.title,
        expertId: learningPlans.expertId,
      })
      .from(learningPlanLessons)
      .innerJoin(learningPlans, eq(learningPlanLessons.planId, learningPlans.id))
      .where(
        and(
          isNull(learningPlanLessons.reminderFiveSentAt),
          gte(learningPlanLessons.scheduledAt, now),
          lte(learningPlanLessons.scheduledAt, fiveWindowEnd)
        )
      ),
  ]);

  for (const lesson of thirtyMinuteLessons.filter((item) => item.scheduledAt)) {
    await sendLessonReminderNotifications({
      lessonId: lesson.lessonId,
      planId: lesson.planId,
      minutesUntilStart: LESSON_REMINDER_THIRTY_MINUTES,
      lessonTitle: lesson.lessonTitle,
      planTitle: lesson.planTitle,
      scheduledAt: lesson.scheduledAt as Date,
      expertId: lesson.expertId,
    });
    await db
      .update(learningPlanLessons)
      .set({ reminderThirtySentAt: now, updatedAt: new Date() })
      .where(eq(learningPlanLessons.id, lesson.lessonId));
  }

  for (const lesson of fiveMinuteLessons.filter((item) => item.scheduledAt)) {
    await sendLessonReminderNotifications({
      lessonId: lesson.lessonId,
      planId: lesson.planId,
      minutesUntilStart: LESSON_REMINDER_FIVE_MINUTES,
      lessonTitle: lesson.lessonTitle,
      planTitle: lesson.planTitle,
      scheduledAt: lesson.scheduledAt as Date,
      expertId: lesson.expertId,
    });
    await db
      .update(learningPlanLessons)
      .set({ reminderFiveSentAt: now, updatedAt: new Date() })
      .where(eq(learningPlanLessons.id, lesson.lessonId));
  }

  return NextResponse.json({
    ok: true,
    thirtyMinuteCount: thirtyMinuteLessons.length,
    fiveMinuteCount: fiveMinuteLessons.length,
  });
}
