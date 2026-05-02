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
import { NotificationService } from "@/services/notification-service";
import { sendAppEmail } from "@/lib/mailer";

const LEARNER_DAILY_LIVE_LIMIT = 3;
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function startLiveRoom(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const groupId = (formData.get("groupId") as string) || null;
  const mode = (formData.get("mode") as string) || "instant";

  if (!title) throw new Error("Title is required");

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

  const startsAt = startsAtStr ? new Date(startsAtStr) : null;
  const endsAt = endsAtStr ? new Date(endsAtStr) : null;
  const isInstant = mode === "instant";
  const autoAdmit = formData.get("autoAdmit") === "on";

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
      title,
      livekitRoomId,
      status: isInstant ? "active" : "scheduled",
      startsAt,
      endsAt,
      autoAdmit,
      maxParticipants: groupId ? 25 : null,
    })
    .returning();

  revalidatePath("/dashboard");

  if (isInstant && !groupId) {
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
          tasks.push(
            sendAppEmail({
              to: recipient.email,
              subject: `${user.displayName} just started a live session`,
              text: [
                `Hello ${recipient.displayName},`,
                ``,
                `${user.displayName} just went live on SkillPulse.`,
                `Session: ${title}`,
                ``,
                `Join here: ${roomUrl}`,
              ].join("\n"),
            }).catch((error) => {
              console.error(`Failed to send instant live email to ${recipient.email}:`, error);
              return false;
            })
          );
        }

        await Promise.all(tasks);
      })
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

  // 2. Broadcast instant kick via Liveblocks
  try {
    await liveblocks.broadcastEvent(roomId, { type: "SESSION_ENDED" });
  } catch (error) {
    console.error("Failed to broadcast SESSION_ENDED:", error);
  }

  // 3. Force-kick LiveKit audio
  try {
    const roomService = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    await roomService.deleteRoom(room.livekitRoomId);
  } catch (error) {
    console.error("Failed to delete LiveKit room:", error);
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
        .map((participant) =>
          emailRoomBoardSummary({
            roomTitle: room.title,
            hostName: host?.displayName || user.displayName,
            participantName: participant.displayName,
            participantEmail: participant.email,
            endedAt,
            boardImageDataUrl,
            boardSummary,
          }).catch((error) => {
            console.error(`Failed to email board summary to ${participant.email}:`, error);
            return false;
          })
        )
    );
  } catch (error) {
    console.error("Failed to prepare participant board summary emails:", error);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
