"use server";

import "server-only";

import { db } from "@/db";
import { connections, roomBookings, rooms, userSettings, users } from "@/db/schema";
import { and, eq, gte, count as drizzleCount, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RoomServiceClient } from "livekit-server-sdk";
import { Liveblocks } from "@liveblocks/node";
import { canUserManageGroup, getGroupByIdWithGovernance } from "@/lib/group-governance";
import { emailRoomBoardSummary, extractBoardSummary } from "@/lib/room-session-export";
import { NotificationService } from "@/services/notificationService";
import { sendAppEmail } from "@/lib/mailer";
import { createOperationalEvent, updateOperationalEvent } from "@/lib/operational-events";
import { archiveRoomSession } from "@/lib/session-archive";
import {
  deriveLessonSessionEnd,
  ensureHostHasNoConflictingLives,
  getLessonForExpertLive,
  isWithinLessonLiveWindow,
} from "@/lib/lesson-live";
import { learningPlanMembers } from "@/db/schema";
import { upsertLessonProgress } from "@/lib/learning-plans";

const LEARNER_DAILY_LIVE_LIMIT = 3;
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function startLiveRoom(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const sessionType = ((formData.get("sessionType") as string) || "general_live") as "general_live" | "lesson_live";
  const planId = (formData.get("planId") as string) || null;
  const lessonId = (formData.get("lessonId") as string) || null;
  const groupId = (formData.get("groupId") as string) || null;
  const mode = (formData.get("mode") as string) || "instant";
  const skillLevel = (formData.get("skillLevel") as string) || null;
  const requestedPriceCredits = Number(formData.get("priceCredits") ?? 0);
  const agendaRaw = formData.get("agenda") as string | null;
  const agenda = agendaRaw
    ? agendaRaw.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  if (sessionType === "general_live" && !title) throw new Error("Title is required");

  if (groupId) {
    const [group, canManage] = await Promise.all([
      getGroupByIdWithGovernance(groupId),
      canUserManageGroup(groupId, user.id),
    ]);

    if (!group) {
      throw new Error("Group not found");
    }

    if (!canManage) {
      throw new Error("Only group admins can create group live chats.");
    }
  }

  const livekitRoomId = `room-${Date.now()}`;

  const startsAtStr = formData.get("startsAt") as string;
  const endsAtStr = formData.get("endsAt") as string;

  let startsAt = startsAtStr ? new Date(startsAtStr) : null;
  let endsAt = endsAtStr ? new Date(endsAtStr) : null;
  const isInstant = mode === "instant";
  const requestedAutoAdmit = formData.get("autoAdmit") === "on";
  const priceCredits = Number.isFinite(requestedPriceCredits) && requestedPriceCredits > 0 && user.role === "expert"
    ? Math.floor(requestedPriceCredits)
    : 0;
  let resolvedTitle = title;
  let countsTowardProgress = false;
  let resolvedSessionNotes: Record<string, unknown> | null = null;
  let autoAdmit = requestedAutoAdmit;

  if (sessionType === "lesson_live") {
    if (!planId || !lessonId) {
      throw new Error("Lesson live sessions require a plan and lesson.");
    }

    const lesson = await getLessonForExpertLive(planId, lessonId, user.id);
    if (!lesson) {
      throw new Error("Lesson not found for this expert.");
    }
    if (!lesson.scheduledAt) {
      throw new Error("This lesson does not have a scheduled start time yet.");
    }
    if (!isInstant) {
      throw new Error("Lesson live sessions can only be started when it is time for the lesson.");
    }
    if (!isWithinLessonLiveWindow(lesson.scheduledAt)) {
      throw new Error("This lesson can only be started close to its scheduled time.");
    }

    startsAt = new Date();
    endsAt = deriveLessonSessionEnd(startsAt, lesson.durationMinutes);
    resolvedTitle = lesson.planTitle ? `${lesson.planTitle}: ${lesson.title}` : lesson.title;
    countsTowardProgress = true;
    autoAdmit = false;
    resolvedSessionNotes = {
      planId,
      lessonId,
      lessonObjective: lesson.objective,
      seededFromLesson: true,
    };
  }

  await ensureHostHasNoConflictingLives({
    hostId: user.id,
    startsAt,
    endsAt,
  });

  // Rate limit: learners can only go live 3 times per day
  if (user.role === "learner") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [{ value: todayCount }] = await db
      .select({ value: drizzleCount() })
      .from(rooms)
      .where(and(eq(rooms.hostId, user.id), gte(rooms.createdAt, startOfDay)));

    if (todayCount >= LEARNER_DAILY_LIVE_LIMIT) {
      throw new Error(`Learners can only go live ${LEARNER_DAILY_LIVE_LIMIT} times per day. Your limit resets at midnight.`);
    }
  }

  const [newRoom] = await db
    .insert(rooms)
    .values({
      hostId: user.id,
      groupId,
      planId,
      lessonId,
      title: resolvedTitle,
      livekitRoomId,
      status: isInstant ? "active" : "scheduled",
      sessionType,
      countsTowardProgress,
      startsAt,
      endsAt,
      autoAdmit,
      priceCredits,
      agenda,
      skillLevel,
      sessionNotes: resolvedSessionNotes,
      maxParticipants: groupId ? 25 : null,
    })
    .returning();

  if (sessionType === "lesson_live" && planId) {
    const planMembers = await db
      .select({ userId: learningPlanMembers.userId })
      .from(learningPlanMembers)
      .where(and(eq(learningPlanMembers.planId, planId), or(eq(learningPlanMembers.status, "invited"), eq(learningPlanMembers.status, "active"))));

    if (planMembers.length > 0) {
      await db
        .insert(roomBookings)
        .values(
          planMembers.map((member) => ({
            roomId: newRoom.id,
            userId: member.userId,
            status: "invited",
            paidCredits: 0,
            paymentMethod: "bonus_credits" as const,
          }))
        )
        .onConflictDoNothing({ target: [roomBookings.roomId, roomBookings.userId] });
    }
  }

  revalidatePath("/dashboard");

  if (isInstant && !groupId && sessionType === "general_live") {
    const friendRecipients = await db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        emailNotifications: userSettings.emailNotifications,
        inAppNotifications: userSettings.inAppNotifications,
      })
      .from(connections)
      .innerJoin(
        users,
        or(
          and(eq(connections.requesterId, user.id), eq(users.id, connections.addresseeId)),
          and(eq(connections.addresseeId, user.id), eq(users.id, connections.requesterId))
        )
      )
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        and(
          or(eq(connections.requesterId, user.id), eq(connections.addresseeId, user.id)),
          eq(connections.status, "accepted")
        )
      );

    const roomPath = `/dashboard/room/${newRoom.id}`;
    const roomUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${roomPath}`;

    await Promise.all(
      friendRecipients.map(async (recipient) => {
        const tasks: Promise<unknown>[] = [];

        if (recipient.inAppNotifications !== false) {
          tasks.push(
            NotificationService.create({
              userId: recipient.userId,
              title: `${user.displayName} is live now`,
              message: `Join "${title}" happening right now.`,
              type: "session_start",
              entityType: "room",
              entityId: newRoom.id,
              actionUrl: roomPath,
            })
          );
        }

        if (recipient.emailNotifications !== false) {
          const emailEventId = await createOperationalEvent({
            event: "instant_live_email",
            scope: "room.start",
            entityType: "room",
            entityId: newRoom.id,
            payload: {
              recipientEmail: recipient.email,
              recipientUserId: recipient.userId,
            },
          });

          tasks.push(
            sendAppEmail({
              to: recipient.email,
              subject: `${user.displayName} just started a live session`,
              text: [
                `Hello ${recipient.displayName},`,
                ``,
                `${user.displayName} just went live on ${process.env.NEXT_PUBLIC_APP_NAME}.`,
                `Session: ${title}`,
                ``,
                `Join here: ${roomUrl}`,
              ].join("\n"),
            })
              .then(async (sent) => {
                await updateOperationalEvent(emailEventId, {
                  status: sent ? "success" : "failed",
                  payload: {
                    recipientEmail: recipient.email,
                    recipientUserId: recipient.userId,
                    sent,
                  },
                  lastError: sent ? null : "Email transport is not configured",
                });
                return sent;
              })
              .catch(async (error) => {
                console.error(`Failed to send instant live email to ${recipient.email}:`, error);
                await updateOperationalEvent(emailEventId, {
                  status: "failed",
                  payload: {
                    recipientEmail: recipient.email,
                    recipientUserId: recipient.userId,
                  },
                  lastError: error instanceof Error ? error.message : "Unknown email error",
                });
                return false;
              })
          );
        }

        await Promise.all(tasks);
      })
    );
  }

  if (isInstant && sessionType === "lesson_live" && planId) {
    const planMembers = await db
      .select({ userId: learningPlanMembers.userId })
      .from(learningPlanMembers)
      .where(and(eq(learningPlanMembers.planId, planId), or(eq(learningPlanMembers.status, "invited"), eq(learningPlanMembers.status, "active"))));

    await Promise.all(
      planMembers.map((member) =>
        NotificationService.createIfNotRecent({
          userId: member.userId,
          title: `${resolvedTitle} is live now`,
          message: "Your lesson has started. Join now to count attendance toward progress.",
          type: "session_start",
          entityType: "room",
          entityId: newRoom.id,
          actionUrl: `/dashboard/room/${newRoom.id}`,
          dedupeHours: 1,
        })
      )
    );
  }

  if (isInstant) {
    redirect(`/dashboard/room/${newRoom.id}`);
  } else {
    redirect("/dashboard");
  }
}

export async function endLiveRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID is required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can end this room");

  const [host] = await db
    .select({
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const endedAt = new Date();
  const boardImageDataUrl = (formData.get("boardImageDataUrl") as string | null) || null;

  let boardSummary = {
    totalElements: 0,
    textSnippets: [] as string[],
    shapeCount: 0,
  };

  try {
    const storageDocument = await liveblocks.getStorageDocument(roomId, "json");
    boardSummary = extractBoardSummary(storageDocument);
  } catch (error) {
    console.error("Failed to load Liveblocks storage for room export:", error);
  }

  // 1. Update DB first
  await db.update(rooms).set({ status: "ended" }).where(eq(rooms.id, roomId));

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
    boardImageDataUrl,
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

  if (room.planId) {
    revalidatePath(`/dashboard/learning/${room.planId}`);
  }
  revalidatePath("/dashboard/learning");

  // 2. Broadcast instant kick via Liveblocks
  const broadcastEventId = await createOperationalEvent({
    event: "session_end_broadcast",
    scope: "room.end",
    entityType: "room",
    entityId: room.id,
  });
  try {
    await liveblocks.broadcastEvent(roomId, { type: "SESSION_ENDED" });
    await updateOperationalEvent(broadcastEventId, {
      status: "success",
      payload: { roomId },
      lastError: null,
    });
  } catch (error) {
    console.error("Failed to broadcast SESSION_ENDED:", error);
    await updateOperationalEvent(broadcastEventId, {
      status: "failed",
      payload: { roomId },
      lastError: error instanceof Error ? error.message : "Unknown broadcast error",
    });
  }

  // 3. Force-kick LiveKit audio
  const livekitCleanupEventId = await createOperationalEvent({
    event: "livekit_room_delete",
    scope: "room.end",
    entityType: "room",
    entityId: room.id,
    payload: { livekitRoomId: room.livekitRoomId },
  });
  try {
    const roomService = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    await roomService.deleteRoom(room.livekitRoomId);
    await updateOperationalEvent(livekitCleanupEventId, {
      status: "success",
      payload: { livekitRoomId: room.livekitRoomId },
      lastError: null,
    });
  } catch (error) {
    console.error("Failed to delete LiveKit room:", error);
    await updateOperationalEvent(livekitCleanupEventId, {
      status: "failed",
      payload: { livekitRoomId: room.livekitRoomId },
      lastError: error instanceof Error ? error.message : "Unknown LiveKit cleanup error",
    });
  }

  // 4. Email the main-board summary PDF to participants if email delivery is configured
  try {
    const participants = await db
      .select({
        email: users.email,
        displayName: users.displayName,
        emailNotifications: userSettings.emailNotifications,
      })
      .from(roomBookings)
      .innerJoin(users, eq(roomBookings.userId, users.id))
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        and(
          eq(roomBookings.roomId, room.id),
          or(eq(roomBookings.status, "admitted"), eq(roomBookings.status, "booked"))
        )
      );

    await Promise.all(
      participants
        .filter((participant) => participant.emailNotifications !== false)
        .map(async (participant) => {
          const emailEventId = await createOperationalEvent({
            event: "room_summary_email",
            scope: "room.end",
            entityType: "room",
            entityId: room.id,
            payload: {
              participantEmail: participant.email,
              participantName: participant.displayName,
            },
          });

          return emailRoomBoardSummary({
            roomTitle: room.title,
            hostName: host?.displayName || user.displayName,
            participantName: participant.displayName,
            participantEmail: participant.email,
            endedAt,
            boardImageDataUrl,
            boardSummary,
          })
            .then(async (sent) => {
              await updateOperationalEvent(emailEventId, {
                status: sent ? "success" : "failed",
                payload: {
                  participantEmail: participant.email,
                  participantName: participant.displayName,
                  sent,
                },
                lastError: sent ? null : "Email transport is not configured",
              });
              return sent;
            })
            .catch(async (error) => {
              console.error(`Failed to email board summary to ${participant.email}:`, error);
              await updateOperationalEvent(emailEventId, {
                status: "failed",
                payload: {
                  participantEmail: participant.email,
                  participantName: participant.displayName,
                },
                lastError: error instanceof Error ? error.message : "Unknown summary email error",
              });
              return false;
            });
        })
    );
  } catch (error) {
    console.error("Failed to prepare participant board summary emails:", error);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
