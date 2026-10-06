"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { expireStaleScheduledRooms } from "@/lib/room-status";
import { getGroupMembershipState } from "@/lib/group-governance";
import { reserveRoomSpotTransactional } from "@/lib/room-booking";

export async function cleanupStaleRooms() {
  await expireStaleScheduledRooms();
}

export async function activateRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID is required");

  await db
    .update(rooms)
    .set({ status: "active" })
    .where(and(eq(rooms.id, roomId), eq(rooms.hostId, user.id)));

  revalidatePath("/dashboard");
  redirect(`/dashboard/room/${roomId}`);
}

export async function joinActiveGroupRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID is required");

  const [room] = await db
    .select({
      id: rooms.id,
      groupId: rooms.groupId,
      hostId: rooms.hostId,
      status: rooms.status,
    })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);

  if (!room) throw new Error("Room not found");
  if (!room.groupId) throw new Error("This join flow is only available for group rooms");
  if (room.hostId === user.id) {
    redirect(`/dashboard/room/${roomId}`);
  }

  const membership = await getGroupMembershipState(room.groupId, user.id);
  if (membership?.status !== "approved") {
    throw new Error("You must be an approved group member to join this room");
  }

  if (room.status !== "active") {
    redirect(`/dashboard/room/${roomId}`);
  }

  await reserveRoomSpotTransactional({
    roomId,
    userId: user.id,
    allowedStatuses: ["active"],
  });

  revalidatePath(`/dashboard/room/${roomId}`);
  redirect(`/dashboard/room/${roomId}`);
}
