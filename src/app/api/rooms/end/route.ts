import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/db";
import { rooms, roomBookings, users, userSettings } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { Liveblocks } from "@liveblocks/node";
import { RoomServiceClient } from "livekit-server-sdk";
import { emailRoomBoardSummary, extractBoardSummary } from "@/lib/room-session-export";
import { createOperationalEvent, updateOperationalEvent } from "@/lib/operational-events";
import { archiveRoomSession } from "@/lib/session-archive";
import { learningPlanMembers } from "@/db/schema";
import { upsertLessonProgress } from "@/lib/learning-plans";
import { NotificationService } from "@/services/notificationService";
import { revalidatePath } from "next/cache";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await request.json() as { roomId?: string };
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== user.id) return NextResponse.json({ error: "Only the host can end this room" }, { status: 403 });
  if (room.status === "ended") return NextResponse.json({ ok: true, alreadyEnded: true });

  // 1. Mark ended in DB
  await db.update(rooms).set({ status: "ended" }).where(eq(rooms.id, roomId));

  // 2. Extract board summary from Liveblocks storage
  const endedAt = new Date();
  let boardSummary = { totalElements: 0, textSnippets: [] as string[], shapeCount: 0 };
  try {
    const doc = await liveblocks.getStorageDocument(roomId, "json");
    boardSummary = extractBoardSummary(doc);
  } catch { /* non-fatal */ }

  const archive = await archiveRoomSession({
    roomId: room.id,
    hostId: room.hostId,
    planId: typeof room.sessionNotes === "object" && room.sessionNotes && "planId" in (room.sessionNotes as Record<string, unknown>)
      ? String((room.sessionNotes as Record<string, unknown>).planId)
      : null,
    lessonId: typeof room.sessionNotes === "object" && room.sessionNotes && "lessonId" in (room.sessionNotes as Record<string, unknown>)
      ? String((room.sessionNotes as Record<string, unknown>).lessonId)
      : null,
    title: room.title,
    skillLevel: room.skillLevel,
    agenda: room.agenda,
    notes: (room.sessionNotes as Record<string, unknown> | null) ?? {},
    startedAt: room.startsAt,
    endedAt,
    summary: boardSummary,
  });

  const sessionDurationSeconds = room.startsAt
    ? Math.max(0, Math.floor((endedAt.getTime() - new Date(room.startsAt).getTime()) / 1000))
    : 0;

  const participantBookings = await db
    .select()
    .from(roomBookings)
    .where(eq(roomBookings.roomId, room.id));

  for (const booking of participantBookings) {
    const effectiveAttendanceSeconds = booking.joinedAt
      ? Math.max(
          booking.attendanceSeconds,
          booking.leftAt
            ? booking.attendanceSeconds
            : booking.attendanceSeconds + Math.max(0, Math.floor((endedAt.getTime() - new Date(booking.joinedAt).getTime()) / 1000))
        )
      : booking.attendanceSeconds;

    const attendanceStatus = sessionDurationSeconds > 0 && effectiveAttendanceSeconds / sessionDurationSeconds >= 0.8
      ? "attended"
      : effectiveAttendanceSeconds > 0
        ? "partial"
        : "not_joined";

    await db
      .update(roomBookings)
      .set({
        leftAt: booking.leftAt ?? endedAt,
        attendanceSeconds: effectiveAttendanceSeconds,
        attendanceStatus,
        feedbackRequestedAt: endedAt,
      })
      .where(eq(roomBookings.id, booking.id));

    if (room.sessionType === "lesson_live" && room.planId && room.lessonId) {
      const [member] = await db
        .select({ id: learningPlanMembers.id })
        .from(learningPlanMembers)
        .where(and(eq(learningPlanMembers.planId, room.planId), eq(learningPlanMembers.userId, booking.userId)))
        .limit(1);

      if (member) {
        await upsertLessonProgress({
          planId: room.planId,
          lessonId: room.lessonId,
          actorUserId: user.id,
          planMemberId: member.id,
          status: attendanceStatus === "attended" ? "completed" : effectiveAttendanceSeconds > 0 ? "in_progress" : "missed",
          notes: attendanceStatus === "partial"
            ? "Learner joined lesson live but did not stay for the full session."
            : attendanceStatus === "attended"
              ? "Completed via lesson live attendance."
              : "Learner missed the live lesson and was marked not attended.",
        });
      }
    }

    await NotificationService.createIfNotRecent({
      userId: booking.userId,
      title: "Rate your session",
      message: `Your session "${room.title}" has ended. Share feedback about the lesson and expert.`,
      type: "system",
      entityType: "room",
      entityId: room.id,
      actionUrl: `/dashboard/session-history/${archive.id}`,
      dedupeHours: 24,
    });
  }

  try {
    await liveblocks.broadcastEvent(roomId, { type: "SESSION_ENDED" });
  } catch {
    // Non-fatal: the client can still detect the ended room on refresh.
  }

  if (room.planId) {
    revalidatePath(`/dashboard/learning/${room.planId}`);
  }
  revalidatePath("/dashboard/learning");

  // 3. Force-delete LiveKit room
  try {
    const svc = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    await svc.deleteRoom(room.livekitRoomId);
  } catch { /* non-fatal */ }

  // 4. Email board summary to admitted participants (fire-and-forget)
  const [host] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, user.id)).limit(1);

  db.select({ email: users.email, displayName: users.displayName, emailNotifications: userSettings.emailNotifications })
    .from(roomBookings)
    .innerJoin(users, eq(roomBookings.userId, users.id))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(eq(roomBookings.roomId, roomId), or(eq(roomBookings.status, "admitted"), eq(roomBookings.status, "booked"))))
    .then(async (participants) => {
      for (const p of participants.filter((x) => x.emailNotifications !== false)) {
        const evId = await createOperationalEvent({
          event: "room_summary_email",
          scope: "room.auto_end",
          entityType: "room",
          entityId: roomId,
          payload: { participantEmail: p.email },
        });
        emailRoomBoardSummary({
          roomTitle: room.title,
          hostName: host?.displayName ?? user.displayName,
          participantName: p.displayName,
          participantEmail: p.email,
          endedAt,
          boardImageDataUrl: null,
          boardSummary,
        })
          .then((sent) => updateOperationalEvent(evId, { status: sent ? "success" : "failed", lastError: sent ? null : "Email not configured" }))
          .catch((err) => updateOperationalEvent(evId, { status: "failed", lastError: (err as Error).message }));
      }
    })
    .catch(console.error);

  return NextResponse.json({ ok: true });
}
