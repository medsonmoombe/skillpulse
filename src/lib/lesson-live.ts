import { db } from "@/db";
import { learningPlanLessons, learningPlans, roomBookings, rooms } from "@/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { NotificationService } from "@/services/notificationService";
import { sendAppEmail } from "@/lib/mailer";
import {
  LESSON_LIVE_EARLY_START_MINUTES,
  LESSON_LIVE_LATE_START_MINUTES,
} from "@/lib/lesson-live-window";

export const LESSON_REMINDER_THIRTY_MINUTES = 30;
export const LESSON_REMINDER_FIVE_MINUTES = 5;
export const ATTENDANCE_COMPLETION_THRESHOLD = 0.8;

export function isWithinLessonLiveWindow(scheduledAt: Date, now = new Date()) {
  const diffMinutes = (now.getTime() - scheduledAt.getTime()) / 60000;
  return diffMinutes >= -LESSON_LIVE_EARLY_START_MINUTES && diffMinutes <= LESSON_LIVE_LATE_START_MINUTES;
}

export function deriveLessonSessionEnd(start: Date, durationMinutes: number | null | undefined) {
  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
  return new Date(start.getTime() + duration * 60 * 1000);
}

export async function getLessonForExpertLive(planId: string, lessonId: string, expertId: string) {
  const [lesson] = await db
    .select({
      lessonId: learningPlanLessons.id,
      planId: learningPlanLessons.planId,
      title: learningPlanLessons.title,
      objective: learningPlanLessons.objective,
      scheduledAt: learningPlanLessons.scheduledAt,
      durationMinutes: learningPlanLessons.durationMinutes,
      planTitle: learningPlans.title,
      expertId: learningPlans.expertId,
    })
    .from(learningPlanLessons)
    .innerJoin(learningPlans, eq(learningPlanLessons.planId, learningPlans.id))
    .where(
      and(
        eq(learningPlanLessons.id, lessonId),
        eq(learningPlanLessons.planId, planId),
        eq(learningPlans.expertId, expertId)
      )
    )
    .limit(1);

  return lesson ?? null;
}

export async function ensureHostHasNoConflictingLives(params: {
  hostId: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  excludeRoomId?: string | null;
}) {
  const { hostId, startsAt, endsAt, excludeRoomId } = params;

  const [activeRoom] = await db
    .select({ id: rooms.id, title: rooms.title })
    .from(rooms)
    .where(
      and(
        eq(rooms.hostId, hostId),
        eq(rooms.status, "active"),
        excludeRoomId ? ne(rooms.id, excludeRoomId) : sql`true`
      )
    )
    .limit(1);

  if (activeRoom) {
    throw new Error(`You already have an active live session: "${activeRoom.title}".`);
  }

  if (!startsAt || !endsAt) {
    return;
  }

  const conflictingScheduled = await db.execute<{ id: string; title: string }>(sql`
    select id, title
    from rooms
    where host_id = ${hostId}::uuid
      and status in ('scheduled', 'active')
      ${excludeRoomId ? sql`and id <> ${excludeRoomId}::uuid` : sql``}
      and starts_at is not null
      and ends_at is not null
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt.toISOString()}::timestamptz, ${endsAt.toISOString()}::timestamptz, '[)')
    limit 1
  `);

  if (conflictingScheduled[0]) {
    throw new Error(`This session overlaps with "${conflictingScheduled[0].title}".`);
  }
}

export async function markRoomAttendanceEvent(params: {
  roomId: string;
  userId: string;
  event: "join" | "leave";
  occurredAt?: Date;
}) {
  const { roomId, userId, event, occurredAt = new Date() } = params;

  const [booking] = await db
    .select()
    .from(roomBookings)
    .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.userId, userId)))
    .limit(1);

  if (!booking) {
    throw new Error("Booking not found for attendance tracking.");
  }

  if (event === "join") {
    const [updated] = await db
      .update(roomBookings)
      .set({
        joinedAt: booking.joinedAt ?? occurredAt,
      })
      .where(eq(roomBookings.id, booking.id))
      .returning();
    return updated;
  }

  const joinedAt = booking.joinedAt ?? occurredAt;
  const totalSeconds = Math.max(
    booking.attendanceSeconds,
    booking.attendanceSeconds + Math.max(0, Math.floor((occurredAt.getTime() - joinedAt.getTime()) / 1000))
  );

  const [updated] = await db
    .update(roomBookings)
    .set({
      leftAt: occurredAt,
      attendanceSeconds: totalSeconds,
    })
    .where(eq(roomBookings.id, booking.id))
    .returning();

  return updated;
}

export async function sendLessonReminderNotifications(params: {
  lessonId: string;
  planId: string;
  minutesUntilStart: number;
  lessonTitle: string;
  planTitle: string;
  scheduledAt: Date;
  expertId: string;
}) {
  const { lessonId, planId, minutesUntilStart, lessonTitle, planTitle, scheduledAt, expertId } = params;

  const recipients = await db.execute<{
    userId: string;
    displayName: string;
    email: string;
    emailNotifications: boolean | null;
    inAppNotifications: boolean | null;
  }>(sql`
    select distinct
      u.id as "userId",
      u.display_name as "displayName",
      u.email as "email",
      us.email_notifications as "emailNotifications",
      us.in_app_notifications as "inAppNotifications"
    from users u
    left join user_settings us on us.user_id = u.id
    where u.id = ${expertId}::uuid
       or exists (
         select 1
         from learning_plan_members lpm
         where lpm.plan_id = ${planId}::uuid
           and lpm.user_id = u.id
           and lpm.status in ('invited', 'active')
       )
  `);

  const title = `${lessonTitle} starts in ${minutesUntilStart} minutes`;
  const message = `Lesson live for "${planTitle}" begins at ${scheduledAt.toLocaleString()}.`;
  const actionUrl = `/dashboard/learning/${planId}`;

  await Promise.all(
    recipients.map(async (recipient) => {
      if (recipient.inAppNotifications !== false) {
        await NotificationService.createIfNotRecent({
          userId: recipient.userId,
          title,
          message,
          type: "system",
          entityType: "room",
          entityId: lessonId,
          actionUrl,
          dedupeHours: 1,
        });
      }

      if (recipient.emailNotifications !== false) {
        await sendAppEmail({
          to: recipient.email,
          subject: title,
          text: [
            `Hello ${recipient.displayName},`,
            ``,
            message,
            `Open plan: ${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")}${actionUrl}`,
          ].join("\n"),
        }).catch(() => false);
      }
    })
  );
}
